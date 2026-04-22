package com.datashifter.execution.checkpoint;

import com.datashifter.common.models.ChunkCursor;
import com.datashifter.execution.repositories.ChunkCursorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Manages pipeline execution checkpoints for pause/resume.
 *
 * Storage strategy:
 *   - Redis (primary): saved after EVERY successful chunk — fast, hot reads
 *   - Postgres (fallback): saved every SYNC_INTERVAL chunks — durable backup
 *   - On resume: load from Redis first → fallback to Postgres
 *   - On completion/reset: clear both Redis and Postgres
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CheckpointManager {

    private final StringRedisTemplate redisTemplate;
    private final ChunkCursorRepository cursorRepository;
    private final ObjectMapper objectMapper;

    private static final String REDIS_KEY = "pipeline:%s:table:%s:checkpoint";

    /** Sync to Postgres every N chunks */
    private static final int POSTGRES_SYNC_INTERVAL = 50;

    private final AtomicLong chunksSinceLastSync = new AtomicLong(0);

    // =========================================================================
    // SAVE
    // =========================================================================

    /**
     * Save checkpoint to Redis (always) + Postgres (every N chunks).
     * Called after every successful chunk write.
     */
    public void saveCheckpoint(Checkpoint checkpoint) {
        // Always save to Redis
        saveToRedis(checkpoint);

        // Periodically sync to Postgres
        long count = chunksSinceLastSync.incrementAndGet();
        if (count % POSTGRES_SYNC_INTERVAL == 0) {
            saveToPostgres(checkpoint);
            log.debug("Checkpoint synced to Postgres at chunk {}", checkpoint.getLastCommittedChunk());
        }
    }

    /**
     * Force save to BOTH Redis and Postgres.
     * Called on pause, stop, error, and table completion — ensures durability.
     */
    public void forceCheckpoint(Checkpoint checkpoint) {
        saveToRedis(checkpoint);
        saveToPostgres(checkpoint);
        chunksSinceLastSync.set(0);
        log.info("Checkpoint force-saved: pipeline={}, table={}, chunk={}, pk={}",
                checkpoint.getPipelineId(), checkpoint.getTableName(),
                checkpoint.getLastCommittedChunk(), checkpoint.getLastCommittedPk());
    }

    // =========================================================================
    // LOAD (for resume)
    // =========================================================================

    /**
     * Load checkpoint for a specific table. Redis first, Postgres fallback.
     */
    public Checkpoint loadCheckpoint(String pipelineId, String tableName) {
        // Try Redis first
        Checkpoint cp = loadFromRedis(pipelineId, tableName);
        if (cp != null) {
            log.debug("Checkpoint loaded from Redis: pipeline={}, table={}, chunk={}",
                    pipelineId, tableName, cp.getLastCommittedChunk());
            return cp;
        }

        // Fallback to Postgres
        cp = loadFromPostgres(pipelineId, tableName);
        if (cp != null) {
            log.info("Checkpoint loaded from Postgres (Redis miss): pipeline={}, table={}, chunk={}",
                    pipelineId, tableName, cp.getLastCommittedChunk());
            // Warm Redis back up
            saveToRedis(cp);
        }

        return cp;
    }

    /**
     * Load all checkpoints for a pipeline — used to restore progress counters on resume.
     */
    public List<Checkpoint> loadAllCheckpoints(String pipelineId) {
        return cursorRepository.findByPipelineIdOrderByCurrentTableIndexAsc(pipelineId)
                .stream()
                .map(this::entityToCheckpoint)
                .toList();
    }

    /**
     * Calculate total rows already processed across all tables — for resume counter restore.
     */
    public long getTotalRowsFromCheckpoints(String pipelineId) {
        return cursorRepository.findByPipelineIdOrderByCurrentTableIndexAsc(pipelineId)
                .stream()
                .mapToLong(ChunkCursor::getRowsProcessed)
                .sum();
    }

    // =========================================================================
    // CLEAR
    // =========================================================================

    /**
     * Clear all checkpoints for a pipeline (on completion or reset).
     */
    @Transactional
    public void clearCheckpoints(String pipelineId) {
        // Clear Redis
        var keys = redisTemplate.keys("pipeline:" + pipelineId + ":table:*:checkpoint");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }

        // Clear Postgres
        cursorRepository.deleteByPipelineId(pipelineId);
        chunksSinceLastSync.set(0);

        log.info("All checkpoints cleared for pipeline: {}", pipelineId);
    }

    // =========================================================================
    // REDIS operations
    // =========================================================================

    private void saveToRedis(Checkpoint checkpoint) {
        String key = String.format(REDIS_KEY, checkpoint.getPipelineId(), checkpoint.getTableName());
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(checkpoint));
        } catch (Exception e) {
            log.error("Failed to save checkpoint to Redis: {}", e.getMessage());
        }
    }

    private Checkpoint loadFromRedis(String pipelineId, String tableName) {
        String key = String.format(REDIS_KEY, pipelineId, tableName);
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json != null) {
                return objectMapper.readValue(json, Checkpoint.class);
            }
        } catch (Exception e) {
            log.warn("Failed to load checkpoint from Redis: {}", e.getMessage());
        }
        return null;
    }

    // =========================================================================
    // POSTGRES operations
    // =========================================================================

    @Transactional
    private void saveToPostgres(Checkpoint checkpoint) {
        try {
            ChunkCursor entity = cursorRepository
                    .findByPipelineIdAndTableName(checkpoint.getPipelineId(), checkpoint.getTableName())
                    .orElse(ChunkCursor.builder()
                            .pipelineId(checkpoint.getPipelineId())
                            .tableName(checkpoint.getTableName())
                            .build());

            entity.setExecutionLogId(checkpoint.getExecutionLogId());
            entity.setCurrentTableIndex(checkpoint.getCurrentTableIndex());
            entity.setLastCommittedChunk(checkpoint.getLastCommittedChunk());
            entity.setLastCommittedPk(checkpoint.getLastCommittedPk());
            entity.setRowsProcessed(checkpoint.getRowsProcessed());
            entity.setCheckpointAt(Instant.now());

            cursorRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to save checkpoint to Postgres: {}", e.getMessage());
        }
    }

    private Checkpoint loadFromPostgres(String pipelineId, String tableName) {
        return cursorRepository.findByPipelineIdAndTableName(pipelineId, tableName)
                .map(this::entityToCheckpoint)
                .orElse(null);
    }

    private Checkpoint entityToCheckpoint(ChunkCursor entity) {
        return Checkpoint.builder()
                .pipelineId(entity.getPipelineId())
                .executionLogId(entity.getExecutionLogId())
                .tableName(entity.getTableName())
                .currentTableIndex(entity.getCurrentTableIndex() != null ? entity.getCurrentTableIndex() : 0)
                .lastCommittedChunk(entity.getLastCommittedChunk() != null ? entity.getLastCommittedChunk() : 0)
                .lastCommittedPk(entity.getLastCommittedPk())
                .rowsProcessed(entity.getRowsProcessed() != null ? entity.getRowsProcessed() : 0)
                .timestamp(entity.getCheckpointAt())
                .build();
    }

    // =========================================================================
    // CHECKPOINT DTO
    // =========================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Checkpoint {
        private String pipelineId;
        private String executionLogId;
        private String tableName;
        private int currentTableIndex;
        private long lastCommittedChunk;
        private String lastCommittedPk;
        private long rowsProcessed;
        private Instant timestamp;
    }
}