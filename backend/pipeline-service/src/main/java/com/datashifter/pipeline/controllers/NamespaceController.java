package com.datashifter.pipeline.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.NamespaceDtos.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import com.datashifter.pipeline.services.implementations.NamespaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/namespaces")
@RequiredArgsConstructor
public class NamespaceController {

    private final NamespaceService namespaceService;

    @GetMapping
    @RequiresPermission(anyOf = {
        Permissions.NAMESPACE_CREATE,
        Permissions.NAMESPACE_EDIT,
        Permissions.NAMESPACE_DELETE,
        Permissions.PIPELINE_VIEW,
        Permissions.PIPELINE_CREATE,
        Permissions.PIPELINE_EDIT
    })
    public ApiResponse<List<NamespaceResponse>> getAll() {
        return ApiResponse.success(namespaceService.getAll());
    }

    @GetMapping("/{id}")
    @RequiresPermission(anyOf = {
        Permissions.NAMESPACE_CREATE,
        Permissions.NAMESPACE_EDIT,
        Permissions.NAMESPACE_DELETE,
        Permissions.PIPELINE_VIEW,
        Permissions.PIPELINE_CREATE,
        Permissions.PIPELINE_EDIT
    })
    public ApiResponse<NamespaceResponse> getById(@PathVariable String id) {
        return ApiResponse.success(namespaceService.getById(id));
    }

    @PostMapping
    @RequiresPermission(Permissions.NAMESPACE_CREATE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<NamespaceResponse> create(@Valid @RequestBody CreateNamespaceRequest request) {
        return ApiResponse.success(namespaceService.create(request), "Namespace created");
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permissions.NAMESPACE_EDIT)
    public ApiResponse<NamespaceResponse> update(@PathVariable String id, @RequestBody UpdateNamespaceRequest request) {
        return ApiResponse.success(namespaceService.update(id, request), "Namespace updated");
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permissions.NAMESPACE_DELETE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        namespaceService.delete(id);
    }

    /** Move a pipeline to a different namespace */
    @PostMapping("/pipelines/{pipelineId}/move")
    @RequiresPermission(anyOf = {Permissions.PIPELINE_EDIT, Permissions.NAMESPACE_EDIT})
    public ApiResponse<Void> movePipeline(@PathVariable String pipelineId,
                                           @Valid @RequestBody MovePipelineRequest request) {
        namespaceService.movePipeline(pipelineId, request.getNamespaceId());
        return ApiResponse.success(null, "Pipeline moved");
    }
}