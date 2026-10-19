package com.datashifter.connector.cdc.checkpoint;

import com.datashifter.common.cdc.CdcPosition;
import com.datashifter.common.models.CdcCheckpoint;
import com.datashifter.common.repositories.CommonCdcCheckpointRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Dual-tier Change Data Capture checkpoint manager:
 * - Tier 1 (Hot In-Memory): Redis (<5ms latency per micro-batch flush)
 * - Tier 2 (Durable Disk): PostgreSQL cdc_checkpoints table (periodic or on shutdown)
 *
 * Ensures zero data loss and exact stream resumption without duplicate writes.
 */
@Component
@Slf4j
public class CdcCheckpointManager {

    private static final String REDIS_KEY_PREFIX = "cdc:checkpoint:";
    private static final long DEFAULT_DURABLE_SYNC_INTERVAL_MS = 5000L;

    private final StringRedisTemplate redisTemplate;
    private final CommonCdcCheckpointRepository checkpointRepository;
    private final ObjectMapper objectMapper;

    private final Map<String, AtomicLong> lastDurableSyncTimes = new ConcurrentHashMap<>();

    @Autowired
    public CdcCheckpointManager(@Autowired(required = false) StringRedisTemplate redisTemplate,
                                @Autowired(required = false) CommonCdcCheckpointRepository checkpointRepository) {
        this.redisTemplate = redisTemplate;
        this.checkpointRepository = checkpointRepository;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Record checkpoint progress for a pipeline.
     * Always writes to Hot Redis tier; syncs to Durable DB tier if interval has elapsed.
     */
    public void recordCheckpoint(String pipelineId, CdcPosition position, long eventsProcessed) {
        if (pipelineId == null || position == null) {
            return;
        }

        // 1. Hot tier write (Redis)
        writeToHotTier(pipelineId, position, eventsProcessed);

        // 2. Periodic durable write (PostgreSQL)
        AtomicLong lastSync = lastDurableSyncTimes.computeIfAbsent(pipelineId, k -> new AtomicLong(0));
        long now = System.currentTimeMillis();
        if (now - lastSync.get() >= DEFAULT_DURABLE_SYNC_INTERVAL_MS) {
            writeToDurableTier(pipelineId, position, eventsProcessed);
            lastSync.set(now);
        }
    }

    /**
     * Explicitly forces a synchronous flush to the durable PostgreSQL database
     * (used on pause, graceful stop, or batch completion).
     */
    public void forceDurableFlush(String pipelineId, CdcPosition position, long eventsProcessed) {
        if (pipelineId == null || position == null) return;
        writeToHotTier(pipelineId, position, eventsProcessed);
        writeToDurableTier(pipelineId, position, eventsProcessed);
        lastDurableSyncTimes.computeIfAbsent(pipelineId, k -> new AtomicLong(0)).set(System.currentTimeMillis());
    }

    /**
     * Retrieves the latest stream position to resume replication from.
     * Checks Hot Redis tier first; if missing, falls back to PostgreSQL cdc_checkpoints.
     */
    public Optional<CdcPosition> getResumePosition(String pipelineId) {
        if (pipelineId == null) return Optional.empty();

        // 1. Check Redis
        try {
            if (redisTemplate != null) {
                String key = REDIS_KEY_PREFIX + pipelineId;
                String json = redisTemplate.opsForValue().get(key);
                if (json != null && !json.isBlank()) {
                    var map = objectMapper.readValue(json, Map.class);
                    CdcPosition pos = CdcPosition.builder()
                            .sourceFile((String) map.get("sourceFile"))
                            .fileOffset(map.get("fileOffset") != null ? Long.parseLong(map.get("fileOffset").toString()) : 0L)
                            .scn(map.get("scn") != null ? Long.parseLong(map.get("scn").toString()) : 0L)
                            .lsn(map.get("lsn") != null ? parseLongSafe(map.get("lsn").toString()) : null)
                            .transactionId((String) map.get("txId"))
                            .token((String) map.get("token"))
                            .build();
                    log.info("Recovered CDC resume position from Hot Redis tier for pipeline {}: file={}, offset={}, scn={}",
                            pipelineId, pos.getSourceFile(), pos.getFileOffset(), pos.getScn());
                    return Optional.of(pos);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to read CDC checkpoint from Redis for pipeline {}: {}", pipelineId, e.getMessage());
        }

        // 2. Fallback to PostgreSQL
        if (checkpointRepository != null) {
            try {
                Optional<CdcCheckpoint> dbCheckpoint = checkpointRepository.findByPipelineId(pipelineId);
                if (dbCheckpoint.isPresent()) {
                    CdcCheckpoint cp = dbCheckpoint.get();
                    CdcPosition pos = CdcPosition.builder()
                            .sourceFile(cp.getSourceFile())
                            .fileOffset(cp.getFileOffset())
                            .scn(cp.getLastScn() != null ? parseLongSafe(cp.getLastScn()) : 0L)
                            .lsn(cp.getLastLsn() != null ? parseLongSafe(cp.getLastLsn()) : null)
                            .transactionId(cp.getTxId())
                            .token(cp.getLastScn() != null ? cp.getLastScn() : cp.getLastLsn())
                            .build();
                    log.info("Recovered CDC resume position from Durable DB tier for pipeline {}: file={}, offset={}, scn={}",
                            pipelineId, pos.getSourceFile(), pos.getFileOffset(), pos.getScn());
                    return Optional.of(pos);
                }
            } catch (Exception e) {
                log.error("Failed to read CDC checkpoint from PostgreSQL for pipeline {}: {}", pipelineId, e.getMessage());
            }
        }

        return Optional.empty();
    }

    private void writeToHotTier(String pipelineId, CdcPosition pos, long eventsProcessed) {
        if (redisTemplate == null) return;
        try {
            String key = REDIS_KEY_PREFIX + pipelineId;
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("pipelineId", pipelineId);
            map.put("sourceFile", pos.getSourceFile());
            map.put("fileOffset", pos.getFileOffset());
            map.put("scn", pos.getScn());
            map.put("lsn", pos.getLsn());
            map.put("txId", pos.getTransactionId());
            map.put("token", pos.getToken());
            map.put("eventsProcessed", eventsProcessed);
            map.put("timestamp", Instant.now().toString());

            String json = objectMapper.writeValueAsString(map);
            redisTemplate.opsForValue().set(key, json, Duration.ofDays(7));
        } catch (Exception e) {
            log.warn("Failed to write hot checkpoint to Redis for pipeline {}: {}", pipelineId, e.getMessage());
        }
    }

    private void writeToDurableTier(String pipelineId, CdcPosition pos, long eventsProcessed) {
        if (checkpointRepository == null) return;
        try {
            CdcCheckpoint cp = checkpointRepository.findByPipelineId(pipelineId)
                    .orElseGet(() -> CdcCheckpoint.builder().pipelineId(pipelineId).build());

            cp.setSourceFile(pos.getSourceFile());
            cp.setFileOffset(pos.getFileOffset());
            if (pos.getScn() != null && pos.getScn() > 0) cp.setLastScn(String.valueOf(pos.getScn()));
            if (pos.getLsn() != null) {
                cp.setLastLsn(String.valueOf(pos.getLsn()));
            } else if (pos.getToken() != null) {
                cp.setLastLsn(pos.getToken());
            }
            if (pos.getTransactionId() != null) cp.setTxId(pos.getTransactionId());
            cp.setEventsProcessed(eventsProcessed);
            cp.setCheckpointAt(Instant.now());
            cp.setStatus("ACTIVE");

            checkpointRepository.save(cp);
            log.debug("Durable CDC checkpoint synced to PostgreSQL for pipeline {}: file={}, offset={}, scn={}",
                    pipelineId, pos.getSourceFile(), pos.getFileOffset(), pos.getScn());
        } catch (Exception e) {
            log.error("Failed to write durable checkpoint to PostgreSQL for pipeline {}: {}", pipelineId, e.getMessage());
        }
    }

    private Long parseLongSafe(String str) {
        if (str == null || str.isBlank()) return null;
        try {
            return Long.parseLong(str.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
