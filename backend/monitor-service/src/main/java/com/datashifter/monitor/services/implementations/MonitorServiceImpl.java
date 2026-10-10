package com.datashifter.monitor.services.implementations;

import com.datashifter.common.dtos.MonitorDtos.*;
import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.models.ErrorLog;
import com.datashifter.common.models.ExecutionLog;
import com.datashifter.common.models.Pipeline;
import com.datashifter.monitor.repositories.ErrorLogRepository;
import com.datashifter.monitor.repositories.ExecutionLogRepository;
import com.datashifter.monitor.repositories.PipelineRepository;
import com.datashifter.monitor.services.interfaces.MonitorService;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MonitorServiceImpl implements MonitorService {

    private final ExecutionLogRepository executionLogRepo;
    private final ErrorLogRepository errorLogRepo;
    private final StringRedisTemplate redisTemplate;
    private final PipelineRepository pipelineRepo;
    private final ObjectMapper objectMapper;

    @Override
    public LiveMonitorResponse getLiveMonitor(String pipelineId) {
        // Read live stats from Redis
        String statsKey = "pipeline:" + pipelineId + ":stats";
        Map<Object, Object> stats = redisTemplate.opsForHash().entries(statsKey);

        Pipeline pipeline = pipelineRepo.findById(pipelineId).orElseThrow(() -> new NoSuchElementException("Pipeline not found: " + pipelineId));

        // In-flight records are delivered via SSE (Kafka → notification-service → browser).
        // On initial page load (before SSE connects), we return an empty list.
        // The frontend populates inflight records from the first SSE progress event.

        return LiveMonitorResponse.builder()
                .pipelineId(pipelineId)
                .pipelineName(pipeline.getName())
                .status(pipeline.getStatus())
                .rowsProcessed(getLongFromMap(stats, "rowsProcessed"))
                .rowsPerSec(getLongFromMap(stats, "rowsPerSec"))
                .avgRowsPerSec(getLongFromMap(stats, "avgRowsPerSec"))
                .errorsSkipped(getLongFromMap(stats, "errorsSkipped"))
                .eta(getStringFromMap(stats, "eta"))
                .overallProgress(getDoubleFromMap(stats, "overallProgress"))
                .previewInflightRecords(pipeline.getPreviewInflightRecords() != null ? pipeline.getPreviewInflightRecords() : true)
                .inflightRecords(List.of())
                .validationErrors(parseValidationErrors(pipeline.getValidationErrors()))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ErrorSummaryResponse getErrorSummary(String pipelineId, int page, int size) {
        
        long total = errorLogRepo.countByPipelineId(pipelineId);

        List<Object[]> typeCounts = errorLogRepo.countByErrorType(pipelineId);
        List<ErrorTypeCount> errorsByType = typeCounts.stream()
                .map(row -> ErrorTypeCount.builder()
                        .type((ErrorType) row[0])
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());

        Page<ErrorLog> errorPage = errorLogRepo.findByPipelineId(pipelineId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        List<ErrorLogResponse> errors = errorPage.getContent().stream()
                .map(this::toErrorResponse)
                .collect(Collectors.toList());

        String pipelineName = pipelineRepo.findById(pipelineId)
                .map(p -> p.getName()).orElse(null);

        return ErrorSummaryResponse.builder()
                .totalErrors(total)
                .errorsByType(errorsByType)
                .errors(errors)
                .pipelineName(pipelineName)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExecutionLogResponse> getExecutionHistory(String pipelineId) {
        return executionLogRepo.findByPipelineIdOrderByStartedAtDesc(pipelineId)
                .stream().map(this::toExecutionResponse).collect(Collectors.toList());
    }

    /* --- Helpers --- */

    private ErrorLogResponse toErrorResponse(ErrorLog e) {
        return ErrorLogResponse.builder()
                .id(e.getId()).errorType(e.getErrorType())
                .sourceTable(e.getSourceTable()).targetTable(e.getTargetTable())
                .chunkNumber(e.getChunkNumber()).rowNumber(e.getRowNumber())
                .errorMessage(e.getErrorMessage()).sourceRowData(e.getSourceRowData())
                .createdAt(e.getCreatedAt()).build();
    }

    private ExecutionLogResponse toExecutionResponse(ExecutionLog e) {
        return ExecutionLogResponse.builder()
                .id(e.getId()).pipelineId(e.getPipelineId()).status(e.getStatus())
                .startedAt(e.getStartedAt()).completedAt(e.getCompletedAt())
                .totalRowsProcessed(e.getTotalRowsProcessed()).totalErrors(e.getTotalErrors())
                .durationMs(e.getDurationMs()).build();
    }

    @Override
    @Transactional
    public void clearErrors(String pipelineId) {
        errorLogRepo.deleteByPipelineId(pipelineId);
        // Also reset error count in Redis stats
        String statsKey = "pipeline:" + pipelineId + ":stats";
        redisTemplate.opsForHash().put(statsKey, "errorsSkipped", "0");
    }

    private String getStringFromMap(Map<Object, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : "";
    }

    private long getLongFromMap(Map<Object, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return 0L;
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return 0L; }
    }

    private double getDoubleFromMap(Map<Object, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return 0.0;
        try { return Double.parseDouble(v.toString()); } catch (NumberFormatException e) { return 0.0; }
    }

    private List<String> parseValidationErrors(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of(json);
        }
    }
}