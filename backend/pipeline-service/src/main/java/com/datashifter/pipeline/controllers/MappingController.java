package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.MappingDtos.*;
import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.pipeline.services.implementations.MappingService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Column mapping endpoints for a pipeline.
 *
 * GET  /api/v1/pipelines/{id}/mappings  → enriched mapping data with live column metadata
 * PUT  /api/v1/pipelines/{id}/mappings  → save/update column mappings
 */
@RestController
@RequestMapping("/api/v1/pipelines/{pipelineId}/mappings")
@RequiredArgsConstructor
public class MappingController {

    private final MappingService mappingService;
    private final PipelineService pipelineService;

    /**
     * Get enriched mapping data — pipeline tables + live column metadata
     * from both source and target databases.
     */
    @GetMapping
    @RequiresPermission(Permissions.PIPELINE_VIEW)
    public ApiResponse<MappingResponse> getMappings(@PathVariable String pipelineId) {
        return ApiResponse.success(mappingService.getMappings(pipelineId));
    }

    /**
     * Save column mappings for all tables.
     */
    @PutMapping
    @RequiresPermission(Permissions.PIPELINE_EDIT)
    public ApiResponse<PipelineResponse> saveMappings(
            @PathVariable String pipelineId,
            @Valid @RequestBody List<PipelineTableRequest> tables) {
        return ApiResponse.success(pipelineService.updateMappings(pipelineId, tables), "Mappings saved");
    }
}