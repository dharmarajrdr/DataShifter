package com.datashifter.connector.cdc.replay;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcPosition;
import com.datashifter.common.cdc.CdcWriteResult;
import com.datashifter.connector.cdc.checkpoint.CdcCheckpointManager;
import com.datashifter.connector.factories.CdcTargetWriterFactory;
import com.datashifter.connector.spi.interfaces.CdcTargetWriter;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Replay Coordinator for Change Data Capture pipelines.
 * Coordinates micro-batch aggregation, partition ordering, resilient target replay with retry,
 * and dual-tier checkpointing.
 */
@Component
@Slf4j
public class CdcReplayCoordinator {

    private final CdcTargetWriterFactory writerFactory;
    private final CdcCheckpointManager checkpointManager;
    private final CdcKeyPartitioner partitioner;

    @Getter
    private final AtomicLong totalEventsReplayed = new AtomicLong(0);

    public CdcReplayCoordinator(CdcTargetWriterFactory writerFactory,
                                CdcCheckpointManager checkpointManager,
                                CdcKeyPartitioner partitioner) {
        this.writerFactory = writerFactory;
        this.checkpointManager = checkpointManager;
        this.partitioner = partitioner;
    }

    /**
     * Applies a micro-batch of events to the target database with idempotent write semantics
     * and dual-tier checkpointing.
     *
     * @param targetConfig target database connection configuration
     * @param events       ordered micro-batch of events
     * @param pipelineId   Datashifter pipeline ID
     * @return summary write result
     */
    public CdcWriteResult replayBatch(ConnectionConfig targetConfig,
                                      List<CdcEvent> events,
                                      String pipelineId) {
        if (events == null || events.isEmpty()) {
            return CdcWriteResult.builder().totalEvents(0).build();
        }

        CdcTargetWriter writer = writerFactory.getWriter(targetConfig.getDbType());

        // Group events by target table to maximize JDBC batching
        Map<String, List<CdcEvent>> tableBatches = new LinkedHashMap<>();
        for (CdcEvent event : events) {
            String table = event.getTableName();
            tableBatches.computeIfAbsent(table, k -> new ArrayList<>()).add(event);
        }

        int totalInserts = 0;
        int totalUpdates = 0;
        int totalDeletes = 0;
        int failureCount = 0;
        List<CdcWriteResult.CdcFailedRecord> failedRecords = new ArrayList<>();

        for (Map.Entry<String, List<CdcEvent>> entry : tableBatches.entrySet()) {
            String table = entry.getKey();
            List<CdcEvent> tableEvents = entry.getValue();

            CdcWriteResult result = executeWithRetry(writer, targetConfig, table, tableEvents, 3);
            totalInserts += result.getAppliedInserts();
            totalUpdates += result.getAppliedUpdates();
            totalDeletes += result.getAppliedDeletes();
            failureCount += result.getFailureCount();
            if (result.getFailedRecords() != null) {
                failedRecords.addAll(result.getFailedRecords());
            }
        }

        long count = totalEventsReplayed.addAndGet(events.size());

        // Checkpoint the latest event position
        CdcEvent lastEvent = events.get(events.size() - 1);
        if (lastEvent.getPosition() != null && checkpointManager != null) {
            checkpointManager.recordCheckpoint(pipelineId, lastEvent.getPosition(), count);
        }

        return CdcWriteResult.builder()
                .totalEvents(events.size())
                .appliedInserts(totalInserts)
                .appliedUpdates(totalUpdates)
                .appliedDeletes(totalDeletes)
                .failureCount(failureCount)
                .failedRecords(failedRecords)
                .build();
    }

    private CdcWriteResult executeWithRetry(CdcTargetWriter writer,
                                            ConnectionConfig config,
                                            String table,
                                            List<CdcEvent> events,
                                            int maxRetries) {
        int attempts = 0;
        long backoffMs = 100L;

        while (true) {
            attempts++;
            try {
                return writer.applyBatch(config, table, events, null);
            } catch (Exception e) {
                if (attempts >= maxRetries) {
                    log.error("Target write failed after {} attempts on table {}: {}", attempts, table, e.getMessage());
                    throw e;
                }
                log.warn("Target write attempt {} failed on table {}: {}. Retrying in {}ms...",
                        attempts, table, e.getMessage(), backoffMs);
                try {
                    Thread.sleep(backoffMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Replay interrupted during retry backoff", ie);
                }
                backoffMs *= 2; // Exponential backoff
            }
        }
    }
}
