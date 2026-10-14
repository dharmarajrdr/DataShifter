package com.datashifter.connector.cdc.replay;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcPosition;
import com.datashifter.common.cdc.CdcWriteResult;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.models.CdcCheckpoint;
import com.datashifter.common.repositories.CommonCdcCheckpointRepository;
import com.datashifter.connector.cdc.checkpoint.CdcCheckpointManager;
import com.datashifter.connector.factories.CdcTargetWriterFactory;
import com.datashifter.connector.spi.interfaces.CdcTargetWriter;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CdcReplayAndCheckpointTest {

    @Test
    @DisplayName("CdcKeyPartitioner: same PK always routes to identical partition")
    void testPartitionerDeterminism() {
        CdcKeyPartitioner partitioner = new CdcKeyPartitioner();

        CdcEvent event1 = CdcEvent.builder()
                .tableName("ORDERS")
                .primaryKeyValues(Map.of("ORDER_ID", 1001))
                .operationType(CdcOperationType.INSERT)
                .build();

        CdcEvent event2 = CdcEvent.builder()
                .tableName("ORDERS")
                .primaryKeyValues(Map.of("ORDER_ID", 1001))
                .operationType(CdcOperationType.UPDATE)
                .build();

        CdcEvent event3 = CdcEvent.builder()
                .tableName("ORDERS")
                .primaryKeyValues(Map.of("ORDER_ID", 1002))
                .operationType(CdcOperationType.INSERT)
                .build();

        int p1 = partitioner.partition(event1, 8);
        int p2 = partitioner.partition(event2, 8);
        int p3 = partitioner.partition(event3, 8);

        // Crucial for CDC consistency: same entity must route to exact same partition
        assertEquals(p1, p2);
        assertTrue(p1 >= 0 && p1 < 8);
        assertTrue(p3 >= 0 && p3 < 8);
    }

    @Test
    @DisplayName("CdcMicroBatchAggregator: triggers on max batch size and time elapsed")
    void testMicroBatchAggregator() throws InterruptedException {
        // Aggregator with maxBatchSize=3 or flushInterval=50ms
        CdcMicroBatchAggregator aggregator = new CdcMicroBatchAggregator(3, 50L);

        CdcEvent e1 = CdcEvent.builder().eventId("1").tableName("T1").build();
        CdcEvent e2 = CdcEvent.builder().eventId("2").tableName("T1").build();
        CdcEvent e3 = CdcEvent.builder().eventId("3").tableName("T1").build();

        assertFalse(aggregator.add(e1));
        assertEquals(1, aggregator.getPendingCount());

        assertFalse(aggregator.add(e2));
        assertEquals(2, aggregator.getPendingCount());

        // 3rd event reaches max batch size -> triggers flush
        assertTrue(aggregator.add(e3));

        List<CdcEvent> drained = aggregator.drain();
        assertEquals(3, drained.size());
        assertEquals(0, aggregator.getPendingCount());

        // Test time interval flush
        aggregator.add(e1);
        assertFalse(aggregator.shouldFlush());
        Thread.sleep(60L);
        assertTrue(aggregator.shouldFlush());
    }

    @Test
    @DisplayName("CdcCheckpointManager: hot Redis write and durable PostgreSQL fallback")
    void testCheckpointManager() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);

        CommonCdcCheckpointRepository repo = mock(CommonCdcCheckpointRepository.class);
        CdcCheckpointManager manager = new CdcCheckpointManager(redis, repo);

        CdcPosition pos = CdcPosition.builder()
                .sourceFile("aa000001")
                .fileOffset(1024L)
                .scn(88000L)
                .token("88000")
                .build();

        // 1. Force durable flush
        manager.forceDurableFlush("pipe-test", pos, 100L);
        verify(ops).set(eq("cdc:checkpoint:pipe-test"), anyString(), any());
        verify(repo).save(any(CdcCheckpoint.class));

        // 2. Recovery when Redis has checkpoint
        when(ops.get("cdc:checkpoint:pipe-test")).thenReturn(
                "{\"sourceFile\":\"aa000001\",\"fileOffset\":1024,\"scn\":88000,\"token\":\"88000\"}"
        );
        Optional<CdcPosition> recoveredFromRedis = manager.getResumePosition("pipe-test");
        assertTrue(recoveredFromRedis.isPresent());
        assertEquals("aa000001", recoveredFromRedis.get().getSourceFile());
        assertEquals(1024L, recoveredFromRedis.get().getFileOffset());
        assertEquals(88000L, recoveredFromRedis.get().getScn());

        // 3. Fallback when Redis is empty but PostgreSQL has checkpoint
        when(ops.get("cdc:checkpoint:pipe-db-only")).thenReturn(null);
        CdcCheckpoint dbCp = CdcCheckpoint.builder()
                .pipelineId("pipe-db-only")
                .sourceFile("aa000005")
                .fileOffset(4096L)
                .lastScn("95000")
                .build();
        when(repo.findByPipelineId("pipe-db-only")).thenReturn(Optional.of(dbCp));

        Optional<CdcPosition> recoveredFromDb = manager.getResumePosition("pipe-db-only");
        assertTrue(recoveredFromDb.isPresent());
        assertEquals("aa000005", recoveredFromDb.get().getSourceFile());
        assertEquals(4096L, recoveredFromDb.get().getFileOffset());
        assertEquals(95000L, recoveredFromDb.get().getScn());
    }

    @Test
    @DisplayName("CdcReplayCoordinator: replays batch with retry and updates checkpoint")
    void testReplayCoordinator() {
        CdcTargetWriterFactory writerFactory = mock(CdcTargetWriterFactory.class);
        CdcTargetWriter mockWriter = mock(CdcTargetWriter.class);
        when(writerFactory.getWriter(DatabaseType.POSTGRESQL)).thenReturn(mockWriter);

        when(mockWriter.applyBatch(any(), any(), any(), any()))
                .thenReturn(CdcWriteResult.builder().totalEvents(2).appliedInserts(2).build());

        CdcCheckpointManager checkpointManager = mock(CdcCheckpointManager.class);
        CdcKeyPartitioner partitioner = new CdcKeyPartitioner();

        CdcReplayCoordinator coordinator = new CdcReplayCoordinator(writerFactory, checkpointManager, partitioner);

        ConnectionConfig config = ConnectionConfig.builder().dbType(DatabaseType.POSTGRESQL).build();
        List<CdcEvent> events = List.of(
                CdcEvent.builder().eventId("e1").tableName("users").operationType(CdcOperationType.INSERT)
                        .position(CdcPosition.builder().scn(100L).build()).build(),
                CdcEvent.builder().eventId("e2").tableName("users").operationType(CdcOperationType.INSERT)
                        .position(CdcPosition.builder().scn(101L).build()).build()
        );

        CdcWriteResult result = coordinator.replayBatch(config, events, "pipe-replay");

        assertEquals(2, result.getAppliedInserts());
        assertEquals(2, coordinator.getTotalEventsReplayed().get());
        verify(mockWriter).applyBatch(eq(config), eq("users"), eq(events), isNull());
        verify(checkpointManager).recordCheckpoint(eq("pipe-replay"), any(CdcPosition.class), eq(2L));
    }
}
