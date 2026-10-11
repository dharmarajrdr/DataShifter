package com.datashifter.monitor.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.MonitorDtos.ErrorSummaryResponse;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import com.datashifter.monitor.services.interfaces.MonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workflows/{workflowId}")
@RequiredArgsConstructor
public class WorkflowMonitorController {

    private final MonitorService monitorService;

    @GetMapping("/errors")
    @RequiresPermission(Permissions.MONITOR_VIEW_ERRORS)
    public ApiResponse<ErrorSummaryResponse> getWorkflowErrors(
            @PathVariable String workflowId,
            @RequestParam(required = false) String pipelineId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(monitorService.getWorkflowErrorSummary(workflowId, pipelineId, page, size));
    }

    @DeleteMapping("/errors")
    @RequiresPermission(Permissions.MONITOR_VIEW_ERRORS)
    public ApiResponse<Void> clearWorkflowErrors(@PathVariable String workflowId) {
        monitorService.clearWorkflowErrors(workflowId);
        return ApiResponse.success(null, "Workflow error logs cleared");
    }
}

