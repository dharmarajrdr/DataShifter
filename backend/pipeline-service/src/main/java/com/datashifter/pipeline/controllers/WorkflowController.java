package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.PipelineDtos.PipelineSummaryResponse;
import com.datashifter.common.dtos.WorkflowDtos.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @PostMapping
    @RequiresPermission(Permissions.WORKFLOW_CREATE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WorkflowResponse> create(@Valid @RequestBody CreateWorkflowRequest request) {
        return ApiResponse.success(workflowService.create(request), "Workflow created");
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permissions.WORKFLOW_EDIT)
    public ApiResponse<WorkflowResponse> update(@PathVariable String id, @RequestBody UpdateWorkflowRequest request) {
        return ApiResponse.success(workflowService.update(id, request), "Workflow updated");
    }

    @PutMapping("/{id}/canvas")
    @RequiresPermission(Permissions.WORKFLOW_EDIT)
    public ApiResponse<WorkflowResponse> saveCanvas(@PathVariable String id, @RequestBody SaveWorkflowCanvasRequest request) {
        return ApiResponse.success(workflowService.saveCanvas(id, request), "Workflow steps saved");
    }

    @PostMapping("/{id}/pipelines")
    @RequiresPermission(Permissions.WORKFLOW_EDIT)
    public ApiResponse<WorkflowResponse> addPipelines(@PathVariable String id, @RequestBody AddWorkflowPipelinesRequest request) {
        return ApiResponse.success(workflowService.addPipelines(id, request), "Pipelines added to workflow");
    }

    @DeleteMapping("/{id}/pipelines/{pipelineId}")
    @RequiresPermission(Permissions.WORKFLOW_EDIT)
    public ApiResponse<WorkflowResponse> removePipeline(@PathVariable String id, @PathVariable String pipelineId) {
        return ApiResponse.success(workflowService.removePipeline(id, pipelineId), "Pipeline removed from workflow");
    }

    @GetMapping("/eligible-pipelines")
    @RequiresPermission(Permissions.WORKFLOW_VIEW)
    public ApiResponse<List<PipelineSummaryResponse>> getEligiblePipelines(@RequestParam(required = false) String workflowId) {
        return ApiResponse.success(workflowService.getEligiblePipelines(workflowId));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permissions.WORKFLOW_VIEW)
    public ApiResponse<WorkflowResponse> getById(@PathVariable String id) {
        return ApiResponse.success(workflowService.getById(id));
    }

    @GetMapping
    @RequiresPermission(Permissions.WORKFLOW_VIEW)
    public ApiResponse<List<WorkflowSummaryResponse>> getAll() {
        return ApiResponse.success(workflowService.getAll());
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permissions.WORKFLOW_DELETE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        workflowService.delete(id);
    }

    @PostMapping("/{id}/validate-pipelines")
    @RequiresPermission(anyOf = {Permissions.WORKFLOW_EDIT, Permissions.PIPELINE_EDIT})
    public ApiResponse<WorkflowResponse> validatePipelines(@PathVariable String id) {
        WorkflowResponse resp = workflowService.validatePipelines(id);
        long bad = resp.getNodes() == null ? 0 : resp.getNodes().stream()
                .filter(n -> n.getPipelineStatus() != com.datashifter.common.enums.PipelineStatus.VALIDATED).count();
        return ApiResponse.success(resp, bad == 0 ? "Pipelines validated" : bad + " pipeline(s) failed validation");
    }

    @PostMapping("/{id}/actions")
    @RequiresPermission(anyOf = {
            Permissions.WORKFLOW_RUN, Permissions.WORKFLOW_PAUSE, Permissions.WORKFLOW_STOP, Permissions.WORKFLOW_EDIT
    })
    public ApiResponse<WorkflowResponse> performAction(@PathVariable String id, @RequestBody WorkflowActionRequest action) {
        return ApiResponse.success(workflowService.performAction(id, action));
    }
}
