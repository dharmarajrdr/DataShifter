package com.datashifter.monitor.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.MonitorDtos.*;
import com.datashifter.monitor.services.interfaces.MonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pipelines/{pipelineId}")
@RequiredArgsConstructor
public class MonitorController {

    private final MonitorService monitorService;

    @GetMapping("/monitor")
    public ApiResponse<LiveMonitorResponse> getLiveMonitor(@PathVariable String pipelineId) {
        return ApiResponse.success(monitorService.getLiveMonitor(pipelineId));
    }

    @GetMapping("/errors")
    public ApiResponse<ErrorSummaryResponse> getErrors(@PathVariable String pipelineId,
                                                        @RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(monitorService.getErrorSummary(pipelineId, page, size));
    }

    @DeleteMapping("/errors")
    public ApiResponse<Void> clearErrors(@PathVariable String pipelineId) {
        monitorService.clearErrors(pipelineId);
        return ApiResponse.success(null, "Error logs cleared");
    }

    @GetMapping("/executions")
    public ApiResponse<List<ExecutionLogResponse>> getExecutionHistory(@PathVariable String pipelineId) {
        return ApiResponse.success(monitorService.getExecutionHistory(pipelineId));
    }
}