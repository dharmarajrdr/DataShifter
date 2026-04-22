package com.datashifter.monitor.consumers;

import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.*;
import com.datashifter.common.models.ErrorLog;
import com.datashifter.monitor.repositories.ErrorLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class PipelineEventConsumer {

    private final ErrorLogRepository errorLogRepository;
    private final StringRedisTemplate redisTemplate;

    @KafkaListener(topics = KafkaTopics.PIPELINE_PROGRESS, groupId = "monitor-service")
    public void handleProgress(ProgressEvent event) {
        log.info("Progress: pipeline={}, table={}, rows={}, progress={}%",
                event.getPipelineId(), event.getTableName(),
                event.getTotalRowsProcessed(), event.getOverallProgress());

        // Update live stats in Redis
        String statsKey = "pipeline:" + event.getPipelineId() + ":stats";
        Map<String, String> stats = new HashMap<>();
        stats.put("rowsProcessed", String.valueOf(event.getTotalRowsProcessed()));
        stats.put("rowsPerSec", String.valueOf(event.getRowsPerSec()));
        stats.put("avgRowsPerSec", String.valueOf(event.getAvgRowsPerSec()));
        stats.put("overallProgress", String.valueOf(event.getOverallProgress()));
        stats.put("currentTable", event.getTableName());
        stats.put("tableIndex", String.valueOf(event.getTableIndex()));
        stats.put("totalTables", String.valueOf(event.getTotalTables()));
        stats.put("eta", event.getEta() != null ? event.getEta() : "—");
        redisTemplate.opsForHash().putAll(statsKey, stats);
    }

    @KafkaListener(topics = KafkaTopics.PIPELINE_ERRORS, groupId = "monitor-service")
    public void handleError(ErrorEvent event) {
        log.warn("Error: pipeline={}, type={}, table={}, row={}",
                event.getPipelineId(), event.getErrorType(),
                event.getSourceTable(), event.getRowNumber());

        // Persist error to Postgres
        ErrorLog errorLog = ErrorLog.builder()
                .pipelineId(event.getPipelineId())
                .executionLogId(event.getExecutionLogId())
                .errorType(event.getErrorType())
                .sourceTable(event.getSourceTable())
                .targetTable(event.getTargetTable())
                .chunkNumber(event.getChunkNumber())
                .rowNumber(event.getRowNumber())
                .errorMessage(event.getErrorMessage())
                .sourceRowData(event.getSourceRowData())
                .build();
        errorLogRepository.save(errorLog);

        // Update error count in Redis
        String statsKey = "pipeline:" + event.getPipelineId() + ":stats";
        redisTemplate.opsForHash().increment(statsKey, "errorsSkipped", 1);
    }
}