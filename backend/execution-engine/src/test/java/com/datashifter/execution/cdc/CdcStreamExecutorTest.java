package com.datashifter.execution.cdc;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcPosition;
import com.datashifter.common.cdc.CdcReaderConfig;
import com.datashifter.common.cdc.CdcWriteResult;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.PipelineMode;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.models.Connection;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.connector.cdc.checkpoint.CdcCheckpointManager;
import com.datashifter.connector.cdc.replay.CdcReplayCoordinator;
import com.datashifter.connector.factories.CdcSourceReaderFactory;
import com.datashifter.common.cdc.CdcSourceReader;
import com.datashifter.execution.consumers.CommandRegistry;

import com.datashifter.execution.repositories.ExecutionConnectionRepository;
import com.datashifter.execution.repositories.ExecutionPipelineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CdcStreamExecutorTest {

    @Mock
    private ExecutionPipelineRepository pipelineRepo;

    @Mock
    private ExecutionConnectionRepository connectionRepo;

    @Mock
    private CdcSourceReaderFactory readerFactory;

    @Mock
    private CdcCheckpointManager checkpointManager;

    @Mock
    private CdcReplayCoordinator replayCoordinator;

    @Mock
    private CommandRegistry commandRegistry;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private CdcSourceReader sourceReader;

    private CdcStreamExecutor executor;
    private Pipeline pipeline;
    private Connection sourceConnection;
    private Connection targetConnection;

    @BeforeEach
    void setUp() {
        executor = new CdcStreamExecutor(
                pipelineRepo,
                connectionRepo,
                readerFactory,
                checkpointManager,
                replayCoordinator,
                commandRegistry,
                kafkaTemplate
        );

        sourceConnection = Connection.builder()
                .dbType(DatabaseType.ORACLE)
                .host("localhost")
                .port(1521)
                .databaseName("ORCLCDB")
                .schemaName("HR")
                .username("system")
                .encryptedPassword("oracle")
                .build();
        sourceConnection.setId("conn-src");

        targetConnection = Connection.builder()
                .dbType(DatabaseType.POSTGRESQL)
                .host("localhost")
                .port(5432)
                .databaseName("target_db")
                .schemaName("public")
                .username("postgres")
                .encryptedPassword("postgres")
                .build();
        targetConnection.setId("conn-tgt");

        pipeline = Pipeline.builder()
                .name("Oracle to Postgres CDC")
                .pipelineMode(PipelineMode.CDC)
                .sourceConnectionId("conn-src")
                .targetConnectionId("conn-tgt")
                .cdcDirectoryPath("/u01/app/oracle/dirdat")
                .cdcFilePattern("aa.*")
                .cdcStartingScn("1847291048")
                .cdcBatchSize(500)
                .cdcFlushIntervalMs(200)
                .status(PipelineStatus.VALIDATED)
                .pipelineTables(new LinkedHashSet<>(List.of(
                        PipelineTable.builder().sourceTable("EMPLOYEES").build()
                )))
                .build();
        pipeline.setId("pipe-cdc-1");

        lenient().when(connectionRepo.findById("conn-src")).thenReturn(Optional.of(sourceConnection));
        lenient().when(connectionRepo.findById("conn-tgt")).thenReturn(Optional.of(targetConnection));
        lenient().when(readerFactory.getReader(DatabaseType.ORACLE)).thenReturn(sourceReader);
    }

    @Test
    @DisplayName("Executes CDC stream, replays polled events, and pauses on PAUSE command")
    void testCdcStreamPollReplayAndPause() throws Exception {
        CdcEvent event1 = CdcEvent.builder()
                .operationType(CdcOperationType.INSERT)
                .tableName("EMPLOYEES")
                .afterData(Map.of("ID", 101, "NAME", "Alice"))
                .position(CdcPosition.builder().scn(1847291050L).build())
                .commitTimestamp(Instant.now())
                .build();


        when(checkpointManager.getResumePosition("pipe-cdc-1")).thenReturn(Optional.empty());
        when(sourceReader.getCurrentPosition()).thenReturn(CdcPosition.builder().scn(1847291050L).build());

        // First poll returns event, then pause requested
        when(sourceReader.poll(anyInt(), any(Duration.class)))
                .thenReturn(List.of(event1));
        when(commandRegistry.isPauseRequested("pipe-cdc-1"))
                .thenReturn(false)
                .thenReturn(true);
        when(replayCoordinator.replayBatch(any(), anyList(), eq("pipe-cdc-1")))
                .thenReturn(CdcWriteResult.builder().totalEvents(1).appliedInserts(1).build());

        executor.executeCdcStream(pipeline, "exec-123");

        ArgumentCaptor<CdcReaderConfig> configCaptor = ArgumentCaptor.forClass(CdcReaderConfig.class);
        verify(sourceReader).open(configCaptor.capture());
        CdcReaderConfig capturedConfig = configCaptor.getValue();
        assertEquals("pipe-cdc-1", capturedConfig.getPipelineId());
        assertEquals(1847291048L, capturedConfig.getStartingPosition().getScn());

        verify(replayCoordinator, atLeastOnce()).replayBatch(any(), anyList(), eq("pipe-cdc-1"));
        verify(checkpointManager).forceDurableFlush(eq("pipe-cdc-1"), any(CdcPosition.class), anyLong());
        verify(sourceReader).close();
        assertEquals(PipelineStatus.PAUSED, pipeline.getStatus());
        verify(commandRegistry).clearCommand("pipe-cdc-1");
    }

    @Test
    @DisplayName("Resumes CDC stream from existing checkpoint position rather than starting SCN")
    void testCdcStreamResumeFromCheckpoint() throws Exception {
        CdcPosition savedCheckpoint = CdcPosition.builder()
                .sourceFile("aa000005")
                .fileOffset(8192L)
                .scn(2050100200L)
                .build();

        when(checkpointManager.getResumePosition("pipe-cdc-1")).thenReturn(Optional.of(savedCheckpoint));
        when(commandRegistry.isStopRequested("pipe-cdc-1")).thenReturn(true);

        executor.executeCdcStream(pipeline, "exec-123");

        ArgumentCaptor<CdcReaderConfig> configCaptor = ArgumentCaptor.forClass(CdcReaderConfig.class);
        verify(sourceReader).open(configCaptor.capture());
        CdcReaderConfig capturedConfig = configCaptor.getValue();
        assertEquals("aa000005", capturedConfig.getStartingPosition().getSourceFile());
        assertEquals(8192L, capturedConfig.getStartingPosition().getFileOffset());
        assertEquals(2050100200L, capturedConfig.getStartingPosition().getScn());

        assertEquals(PipelineStatus.ERRORED, pipeline.getStatus());
    }

    @Test
    @DisplayName("Gracefully stops on STOP command and marks status ERRORED")
    void testCdcStreamStopCommand() throws Exception {
        when(checkpointManager.getResumePosition("pipe-cdc-1")).thenReturn(Optional.empty());
        when(commandRegistry.isPauseRequested("pipe-cdc-1")).thenReturn(false);
        when(commandRegistry.isStopRequested("pipe-cdc-1")).thenReturn(true);

        executor.executeCdcStream(pipeline, "exec-123");

        verify(sourceReader).open(any());
        verify(sourceReader).close();
        assertEquals(PipelineStatus.ERRORED, pipeline.getStatus());
        verify(commandRegistry).clearCommand("pipe-cdc-1");
        verify(kafkaTemplate, atLeastOnce()).send(eq(KafkaTopics.PIPELINE_STATUS), any());
    }

    @Test
    @DisplayName("Executes PostgreSQL WAL stream with LSN starting position")
    void testPostgresWalStreamExecutionWithLsn() throws Exception {
        sourceConnection.setDbType(DatabaseType.POSTGRESQL);
        pipeline.setCdcLogType("POSTGRES_WAL");
        pipeline.setCdcStartingScn("0/3D7E5D8");
        pipeline.setCdcDirectoryPath("/var/lib/postgresql/data/pg_wal");

        when(readerFactory.getReader(DatabaseType.POSTGRESQL)).thenReturn(sourceReader);
        when(checkpointManager.getResumePosition("pipe-cdc-1")).thenReturn(Optional.empty());
        when(commandRegistry.isPauseRequested("pipe-cdc-1")).thenReturn(false);
        when(commandRegistry.isStopRequested("pipe-cdc-1")).thenReturn(true);

        executor.executeCdcStream(pipeline, "exec-wal-1");

        verify(readerFactory).getReader(DatabaseType.POSTGRESQL);
        verify(sourceReader).open(argThat(cfg ->
                cfg.getStartingPosition() != null &&
                cfg.getStartingPosition().getLsn() != null &&
                cfg.getStartingPosition().getLsn() == 64480728L &&
                "0/3D7E5D8".equals(cfg.getStartingPosition().getToken())
        ));
        verify(sourceReader).close();
    }
}
