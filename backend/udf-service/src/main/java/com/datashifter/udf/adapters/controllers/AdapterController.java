package com.datashifter.udf.adapters.controllers;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.dtos.AdapterDtos.AdapterResponse;
import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import com.datashifter.udf.adapters.services.AdapterRegistryService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST controller for DataShifter Adapter Registry operations.
 */
@RestController
@RequestMapping("/api/v1/adapters")
@RequiredArgsConstructor
public class AdapterController {

    private final AdapterRegistryService service;

    @GetMapping
    @RequiresPermission(Permissions.ADAPTER_VIEW)
    public ApiResponse<List<AdapterResponse>> getAll(
            @RequestParam(value = "type", required = false) AdapterType type,
            @RequestParam(value = "mode", required = false) AdapterMode mode,
            @RequestParam(value = "category", required = false) String category) {
        return ApiResponse.success(service.getAllAvailable(type, mode, category));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permissions.ADAPTER_VIEW)
    public ApiResponse<AdapterResponse> getById(@PathVariable String id) {
        return ApiResponse.success(service.getById(id));
    }

    @GetMapping("/key/{adapterKey}")
    @RequiresPermission(Permissions.ADAPTER_VIEW)
    public ApiResponse<AdapterResponse> getByKey(@PathVariable String adapterKey) {
        return ApiResponse.success(service.getByKey(adapterKey));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permissions.ADAPTER_CREATE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdapterResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description) {
        return ApiResponse.success(service.uploadAdapter(name, description, file), "Adapter uploaded successfully");
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permissions.ADAPTER_DELETE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.deleteAdapter(id);
    }

    @GetMapping("/{id}/download")
    @RequiresPermission(Permissions.ADAPTER_VIEW)
    public ResponseEntity<Resource> download(@PathVariable String id) {
        AdapterResponse adapter = service.getById(id);
        Resource resource = service.loadArtifact(id);
        String filename = adapter.getArtifactName() != null ? adapter.getArtifactName() : adapter.getAdapterKey() + ".jar";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }

    @PostMapping("/sync-builtin")
    @RequiresPermission(Permissions.SETTINGS_EDIT)
    public ApiResponse<String> syncBuiltInAdapters() {
        service.syncBuiltIns();
        return ApiResponse.success("Built-in adapters synchronized successfully");
    }
}
