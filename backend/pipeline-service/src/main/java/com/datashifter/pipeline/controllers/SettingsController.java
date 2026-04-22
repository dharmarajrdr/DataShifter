package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Pipeline settings endpoints.
 *
 * GET  /api/v1/pipelines/{id}/settings  → get pipeline config (chunk size, write mode, etc.)
 * PUT  /api/v1/pipelines/{id}/settings  → update pipeline config
 */
@RestController
@RequestMapping("/api/v1/pipelines/{pipelineId}/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final PipelineService pipelineService;

    @GetMapping
    public ApiResponse<PipelineResponse> getSettings(@PathVariable String pipelineId) {
        return ApiResponse.success(pipelineService.getById(pipelineId));
    }

    @PutMapping
    public ApiResponse<PipelineResponse> updateSettings(
            @PathVariable String pipelineId,
            @RequestBody UpdatePipelineRequest request) {
        return ApiResponse.success(pipelineService.update(pipelineId, request), "Settings updated");
    }

    @PostMapping("/tables")
    public ApiResponse<PipelineResponse> addTablePair(
            @PathVariable String pipelineId,
            @RequestBody AddTablePairRequest request) {
        return ApiResponse.success(pipelineService.addTablePair(pipelineId, request), "Table pair added");
    }

    @DeleteMapping("/tables/{pipelineTableId}")
    public ApiResponse<PipelineResponse> removeTablePair(
            @PathVariable String pipelineId,
            @PathVariable String pipelineTableId) {
        return ApiResponse.success(pipelineService.removeTablePair(pipelineId, pipelineTableId), "Table pair removed");
    }
}