package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.CdcDtos.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import com.datashifter.pipeline.services.interfaces.CdcCheckpointService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pipelines/{pipelineId}/cdc")
@RequiredArgsConstructor
public class CdcController {

    private final CdcCheckpointService cdcCheckpointService;

    @GetMapping("/checkpoint")
    @RequiresPermission(Permissions.CDC_VIEW)
    public ApiResponse<CdcCheckpointResponse> getCheckpoint(@PathVariable String pipelineId) {
        return ApiResponse.success(cdcCheckpointService.getCheckpoint(pipelineId));
    }

    @PostMapping("/checkpoint/reset")
    @RequiresPermission(Permissions.CDC_MANAGE)
    public ApiResponse<CdcCheckpointResponse> resetCheckpoint(
            @PathVariable String pipelineId,
            @RequestBody ResetCdcCheckpointRequest request) {
        return ApiResponse.success(cdcCheckpointService.resetCheckpoint(pipelineId, request), "CDC checkpoint updated");
    }

    @DeleteMapping("/checkpoint")
    @RequiresPermission(Permissions.CDC_MANAGE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearCheckpoint(@PathVariable String pipelineId) {
        cdcCheckpointService.clearCheckpoint(pipelineId);
    }
}
