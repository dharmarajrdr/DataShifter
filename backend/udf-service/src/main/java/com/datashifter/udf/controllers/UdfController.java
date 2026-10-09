package com.datashifter.udf.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.UdfDtos.UdfResponse;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import com.datashifter.udf.services.UdfRegistryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/udfs")
@RequiredArgsConstructor
public class UdfController {

    private final UdfRegistryService service;
    private final com.datashifter.udf.services.UdfExecutionService executionService;

    @GetMapping
    @RequiresPermission(Permissions.UDF_VIEW)
    public ApiResponse<List<UdfResponse>> getAll() {
        return ApiResponse.success(service.getAll());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequiresPermission(Permissions.UDF_CREATE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UdfResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description) {
        return ApiResponse.success(service.upload(name, description, file), "UDF uploaded");
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permissions.UDF_DELETE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(id);
    }

    @PostMapping("/{id}/test")
    @RequiresPermission(Permissions.UDF_VIEW)
    public ApiResponse<java.util.Map<String, Object>> test(
            @PathVariable String id,
            @RequestBody com.datashifter.common.dtos.UdfDtos.UdfTestRequest request) {
        return ApiResponse.success(service.testFunction(id, request.getClassName(), request.getMethodName(), request.getInputData(), executionService));
    }
}