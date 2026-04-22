package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import com.datashifter.common.security.RequiresPermission;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pipelines")
@RequiredArgsConstructor
public class PipelineController {

    private final PipelineService pipelineService;

    @PostMapping
    @RequiresPermission("pipeline:create")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PipelineResponse> create(@Valid @RequestBody CreatePipelineRequest request) {
        return ApiResponse.success(pipelineService.create(request), "Pipeline created");
    }

    @PutMapping("/{id}")
    public ApiResponse<PipelineResponse> update(@PathVariable String id, @RequestBody UpdatePipelineRequest request) {
        return ApiResponse.success(pipelineService.update(id, request), "Pipeline updated");
    }

    @GetMapping("/{id}")
    public ApiResponse<PipelineResponse> getById(@PathVariable String id) {
        return ApiResponse.success(pipelineService.getById(id));
    }

    @GetMapping
    public ApiResponse<List<PipelineSummaryResponse>> getAll() {
        return ApiResponse.success(pipelineService.getAll());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        pipelineService.delete(id);
    }

    @PostMapping("/{id}/actions")
    public ApiResponse<PipelineResponse> performAction(@PathVariable String id,
                                                        @Valid @RequestBody PipelineActionRequest action) {
        return ApiResponse.success(pipelineService.performAction(id, action));
    }
}
