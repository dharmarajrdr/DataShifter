package com.datashifter.monitor.services.implementations;

import com.datashifter.common.dtos.MonitorDtos.*;
import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.models.ErrorLog;
import com.datashifter.common.models.ExecutionLog;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.Workflow;
import com.datashifter.common.models.WorkflowNode;
import com.datashifter.common.repositories.CommonWorkflowNodeRepository;
import com.datashifter.common.repositories.CommonWorkflowRepository;
import com.datashifter.monitor.repositories.ErrorLogRepository;
import com.datashifter.monitor.repositories.ExecutionLogRepository;
import com.datashifter.monitor.repositories.PipelineRepository;
import com.datashifter.monitor.services.interfaces.MonitorService;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
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
    private final CommonWorkflowRepository workflowRepo;
    private final CommonWorkflowNodeRepository workflowNodeRepo;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get real-time monitoring metrics for a pipeline by ID, including status, rowsProcessed, rowsPerSec, avgRowsPerSec, errorsSkipped, ETA, overallProgress, and validationErrors.")
    public LiveMonitorResponse getLiveMonitor(
            @ToolParam(description = "The unique ID of the pipeline to monitor") String pipelineId) {
        // Read live stats from Redis
        String statsKey = "pipeline:" + pipelineId + ":stats";
        Map<Object, Object> stats = redisTemplate.opsForHash().entries(statsKey);

        Pipeline pipeline = pipelineRepo.findById(pipelineId).orElseThrow(() -> new NoSuchElementException("Pipeline not found: " + pipelineId));

        var nodeOpt = workflowNodeRepo.findByPipelineIdWithWorkflow(pipelineId);
        String workflowId = nodeOpt.map(n -> n.getWorkflow().getId()).orElse(null);
        String workflowName = nodeOpt.map(n -> n.getWorkflow().getName()).orElse(null);

        // In-flight records: read from Redis cache if available, falling back to empty list.
        List<Map<String, Object>> inflight = List.of();
        try {
            String inflightJson = redisTemplate.opsForValue().get("pipeline:" + pipelineId + ":inflight");
            if (inflightJson != null && !inflightJson.isBlank()) {
                inflight = objectMapper.readValue(inflightJson, new TypeReference<List<Map<String, Object>>>() {});
            }
        } catch (Exception ignored) {}

        long errorLogsCount = errorLogRepo.countByPipelineId(pipelineId);
        long errorsSkipped = Math.max(getLongFromMap(stats, "errorsSkipped"), errorLogsCount);
        if (errorsSkipped > getLongFromMap(stats, "errorsSkipped")) {
            try { redisTemplate.opsForHash().put(statsKey, "errorsSkipped", String.valueOf(errorsSkipped)); } catch (Exception ignored) {}
        }

        boolean isCdc = pipeline.getPipelineMode() != null && pipeline.getPipelineMode().name().equalsIgnoreCase("CDC");
        long rowsProcessed = getLongFromMap(stats, "rowsProcessed");
        long insertCount = getLongFromMap(stats, "insertCount");
        long updateCount = getLongFromMap(stats, "updateCount");
        long deleteCount = getLongFromMap(stats, "deleteCount");
        long filteredCount = getLongFromMap(stats, "filteredCount");
        if (isCdc && rowsProcessed > 0 && insertCount == 0 && updateCount == 0 && deleteCount == 0) {
            insertCount = rowsProcessed;
        }

        return LiveMonitorResponse.builder()
                .pipelineId(pipelineId)
                .pipelineName(pipeline.getName())
                .status(pipeline.getStatus())
                .rowsProcessed(rowsProcessed)
                .rowsPerSec(getLongFromMap(stats, "rowsPerSec"))
                .avgRowsPerSec(getLongFromMap(stats, "avgRowsPerSec"))
                .errorsSkipped(errorsSkipped)
                .eta(getStringFromMap(stats, "eta"))
                .overallProgress(getDoubleFromMap(stats, "overallProgress"))
                .previewInflightRecords(pipeline.getPreviewInflightRecords() != null ? pipeline.getPreviewInflightRecords() : true)
                .inflightRecords(inflight != null ? inflight : List.of())
                .validationErrors(parseValidationErrors(pipeline.getValidationErrors()))
                .workflowId(workflowId)
                .workflowName(workflowName)
                .pipelineMode(pipeline.getPipelineMode() != null ? pipeline.getPipelineMode().name() : null)
                .isCdc(isCdc)
                .currentLsn(getStringFromMap(stats, "currentLsn"))
                .currentScn(getStringFromMap(stats, "currentScn"))
                .currentSourceFile(getStringFromMap(stats, "currentSourceFile"))
                .insertCount(insertCount)
                .updateCount(updateCount)
                .deleteCount(deleteCount)
                .filteredCount(filteredCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get paginated error logs and error counts grouped by error type (TRANSFORMATION_ERROR, CONSTRAINT_VIOLATION, CONNECTION_TIMEOUT, DATA_TRUNCATION, UNKNOWN) for debugging a pipeline.")
    public ErrorSummaryResponse getErrorSummary(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId,
            @ToolParam(description = "Zero-based page index (e.g., 0)") int page,
            @ToolParam(description = "Number of error records per page (e.g., 20)") int size) {
        
        long total = errorLogRepo.countByPipelineId(pipelineId);

        List<Object[]> typeCounts = errorLogRepo.countByErrorType(pipelineId);
        List<ErrorTypeCount> errorsByType = typeCounts.stream()
                .map(row -> ErrorTypeCount.builder()
                        .type((ErrorType) row[0])
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());

        Page<ErrorLog> errorPage = errorLogRepo.findByPipelineId(pipelineId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        String pipelineName = pipelineRepo.findById(pipelineId)
                .map(Pipeline::getName).orElse(null);
        Map<String, String> nameMap = pipelineName != null ? Map.of(pipelineId, pipelineName) : Map.of();

        List<ErrorLogResponse> errors = errorPage.getContent().stream()
                .map(e -> toErrorResponse(e, nameMap))
                .collect(Collectors.toList());

        return ErrorSummaryResponse.builder()
                .totalErrors(total)
                .errorsByType(errorsByType)
                .errors(errors)
                .pipelineName(pipelineName)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get aggregated error summary and detailed error logs across all pipelines (or a specific filtered pipeline) within a workflow for debugging workflow failures.")
    public ErrorSummaryResponse getWorkflowErrorSummary(
            @ToolParam(description = "The unique ID of the workflow") String workflowId,
            @ToolParam(description = "Optional pipeline ID to filter errors within the workflow (null or empty for all)") String pipelineIdFilter,
            @ToolParam(description = "Zero-based page index (e.g., 0)") int page,
            @ToolParam(description = "Number of error records per page (e.g., 20)") int size) {
        Workflow workflow = findWorkflowForCurrentOrg(workflowId);

        List<WorkflowNode> nodes = workflowNodeRepo.findByWorkflow_Id(workflowId);
        List<String> allPipelineIds = nodes.stream().map(WorkflowNode::getPipelineId).toList();
        Map<String, String> pipelineNames = pipelineRepo.findAllById(allPipelineIds).stream()
                .collect(Collectors.toMap(Pipeline::getId, Pipeline::getName, (a, b) -> a));

        List<String> targetPipelineIds;
        if (pipelineIdFilter != null && !pipelineIdFilter.isBlank() && allPipelineIds.contains(pipelineIdFilter)) {
            targetPipelineIds = List.of(pipelineIdFilter);
        } else {
            targetPipelineIds = allPipelineIds;
        }

        if (targetPipelineIds.isEmpty()) {
            return ErrorSummaryResponse.builder()
                    .totalErrors(0)
                    .errorsByType(List.of())
                    .errors(List.of())
                    .pipelineName(workflow.getName())
                    .build();
        }

        long total = errorLogRepo.countByPipelineIdIn(targetPipelineIds);
        List<Object[]> typeCounts = errorLogRepo.countByErrorTypeIn(targetPipelineIds);
        List<ErrorTypeCount> errorsByType = typeCounts.stream()
                .map(row -> ErrorTypeCount.builder()
                        .type((ErrorType) row[0])
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());

        Page<ErrorLog> errorPage = errorLogRepo.findByPipelineIdIn(
                targetPipelineIds,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        List<ErrorLogResponse> errors = errorPage.getContent().stream()
                .map(e -> toErrorResponse(e, pipelineNames))
                .collect(Collectors.toList());

        return ErrorSummaryResponse.builder()
                .totalErrors(total)
                .errorsByType(errorsByType)
                .errors(errors)
                .pipelineName(workflow.getName())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get historical execution run logs (status, startedAt, completedAt, totalRowsProcessed, totalErrors, durationMs) for a pipeline.")
    public List<ExecutionLogResponse> getExecutionHistory(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId) {
        return executionLogRepo.findByPipelineIdOrderByStartedAtDesc(pipelineId)
                .stream().map(this::toExecutionResponse).collect(Collectors.toList());
    }

    /* --- Helpers --- */

    private Workflow findWorkflowForCurrentOrg(String workflowId) {
        String orgId = com.datashifter.common.security.UserContext.getCurrentOrgId();
        if (orgId != null && !orgId.isBlank()) {
            return workflowRepo.findByIdAndOrgId(workflowId, orgId)
                    .orElseThrow(() -> new NoSuchElementException("Workflow not found: " + workflowId));
        }
        return workflowRepo.findById(workflowId)
                .orElseThrow(() -> new NoSuchElementException("Workflow not found: " + workflowId));
    }

    private ErrorLogResponse toErrorResponse(ErrorLog e, Map<String, String> pipelineNames) {
        return ErrorLogResponse.builder()
                .id(e.getId())
                .pipelineId(e.getPipelineId())
                .pipelineName(pipelineNames.getOrDefault(e.getPipelineId(), null))
                .errorType(e.getErrorType())
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
    @Tool(description = "Clear all recorded error logs and reset skipped error counters for a pipeline.")
    public void clearErrors(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId) {
        errorLogRepo.deleteByPipelineId(pipelineId);
        // Also reset error count in Redis stats
        String statsKey = "pipeline:" + pipelineId + ":stats";
        redisTemplate.opsForHash().put(statsKey, "errorsSkipped", "0");
    }

    @Override
    @Transactional
    @Tool(description = "Clear all recorded error logs across all pipelines belonging to a workflow.")
    public void clearWorkflowErrors(
            @ToolParam(description = "The unique ID of the workflow") String workflowId) {
        findWorkflowForCurrentOrg(workflowId);
        List<WorkflowNode> nodes = workflowNodeRepo.findByWorkflow_Id(workflowId);
        List<String> pipelineIds = nodes.stream().map(WorkflowNode::getPipelineId).toList();
        if (!pipelineIds.isEmpty()) {
            errorLogRepo.deleteByPipelineIdIn(pipelineIds);
            for (String pid : pipelineIds) {
                redisTemplate.opsForHash().put("pipeline:" + pid + ":stats", "errorsSkipped", "0");
            }
        }
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