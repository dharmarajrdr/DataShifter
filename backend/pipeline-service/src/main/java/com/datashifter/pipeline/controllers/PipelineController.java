package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pipelines")
@RequiredArgsConstructor
public class PipelineController {

    private final PipelineService pipelineService;

    @PostMapping
    @RequiresPermission(Permissions.PIPELINE_CREATE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PipelineResponse> create(@Valid @RequestBody CreatePipelineRequest request) {
        return ApiResponse.success(pipelineService.create(request), "Pipeline created");
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permissions.PIPELINE_EDIT)
    public ApiResponse<PipelineResponse> update(@PathVariable String id, @RequestBody UpdatePipelineRequest request) {
        return ApiResponse.success(pipelineService.update(id, request), "Pipeline updated");
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permissions.PIPELINE_VIEW)
    public ApiResponse<PipelineResponse> getById(@PathVariable String id) {
        return ApiResponse.success(pipelineService.getById(id));
    }

    @GetMapping
    @RequiresPermission(Permissions.PIPELINE_VIEW)
    public ApiResponse<List<PipelineSummaryResponse>> getAll() {
        return ApiResponse.success(pipelineService.getAll());
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permissions.PIPELINE_DELETE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        pipelineService.delete(id);
    }

    @PostMapping("/{id}/actions")
    @RequiresPermission(anyOf = {
        Permissions.PIPELINE_RUN,
        Permissions.PIPELINE_PAUSE,
        Permissions.PIPELINE_STOP,
        Permissions.PIPELINE_EDIT
    })
    public ApiResponse<PipelineResponse> performAction(@PathVariable String id,
                                                        @Valid @RequestBody PipelineActionRequest action) {
        return ApiResponse.success(pipelineService.performAction(id, action));
    }
}
