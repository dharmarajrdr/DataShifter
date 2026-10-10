package com.datashifter.connector.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.dtos.TableOrderDtos.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.connector.services.implementations.TableOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/connections")
@RequiredArgsConstructor
public class ConnectionController {

    private final ConnectionService connectionService;
    private final TableOrderService tableOrderService;

    @PostMapping
    @RequiresPermission(Permissions.CONNECTION_CREATE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ConnectionResponse> create(@Valid @RequestBody CreateConnectionRequest request) {
        return ApiResponse.success(connectionService.create(request), "Connection created");
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permissions.CONNECTION_EDIT)
    public ApiResponse<ConnectionResponse> update(@PathVariable String id, @RequestBody UpdateConnectionRequest request) {
        return ApiResponse.success(connectionService.update(id, request), "Connection updated");
    }

    @GetMapping("/{id}")
    @RequiresPermission(anyOf = {
        Permissions.CONNECTION_CREATE,
        Permissions.CONNECTION_EDIT,
        Permissions.CONNECTION_DELETE,
        Permissions.CONNECTION_TEST,
        Permissions.CONNECTION_BROWSE_SCHEMA,
        Permissions.PIPELINE_VIEW,
        Permissions.PIPELINE_CREATE,
        Permissions.PIPELINE_EDIT
    })
    public ApiResponse<ConnectionResponse> getById(@PathVariable String id) {
        return ApiResponse.success(connectionService.getById(id));
    }

    @GetMapping
    @RequiresPermission(anyOf = {
        Permissions.CONNECTION_CREATE,
        Permissions.CONNECTION_EDIT,
        Permissions.CONNECTION_DELETE,
        Permissions.CONNECTION_TEST,
        Permissions.CONNECTION_BROWSE_SCHEMA,
        Permissions.PIPELINE_VIEW,
        Permissions.PIPELINE_CREATE,
        Permissions.PIPELINE_EDIT
    })
    public ApiResponse<List<ConnectionResponse>> getAll() {
        return ApiResponse.success(connectionService.getAll());
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permissions.CONNECTION_DELETE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        connectionService.delete(id);
    }

    @PostMapping("/{id}/test")
    @RequiresPermission(Permissions.CONNECTION_TEST)
    public ApiResponse<TestConnectionResponse> test(@PathVariable String id) {
        return ApiResponse.success(connectionService.testConnection(id));
    }

    @GetMapping("/{id}/tables")
    @RequiresPermission(Permissions.CONNECTION_BROWSE_SCHEMA)
    public ApiResponse<List<String>> listTables(@PathVariable String id) {
        return ApiResponse.success(connectionService.listTables(id));
    }

    @GetMapping("/{id}/tables/{tableName}")
    @RequiresPermission(Permissions.CONNECTION_BROWSE_SCHEMA)
    public ApiResponse<TableMetadata> getTableMetadata(@PathVariable String id, @PathVariable String tableName) {
        return ApiResponse.success(connectionService.getTableMetadata(id, tableName));
    }

    @GetMapping("/{id}/tables/{tableName}/foreign-keys")
    @RequiresPermission(Permissions.CONNECTION_BROWSE_SCHEMA)
    public ApiResponse<List<ForeignKeyMetadata>> getForeignKeys(@PathVariable String id, @PathVariable String tableName) {
        return ApiResponse.success(connectionService.getForeignKeys(id, tableName));
    }

    /* ===== Table dependency ordering ===== */

    @PostMapping("/smart-order")
    @RequiresPermission(anyOf = {Permissions.CONNECTION_BROWSE_SCHEMA, Permissions.PIPELINE_CREATE, Permissions.PIPELINE_EDIT})
    public ApiResponse<SmartOrderResponse> smartOrder(@Valid @RequestBody SmartOrderRequest request) {
        return ApiResponse.success(tableOrderService.smartOrder(request), "Smart order computed");
    }

    @PostMapping("/validate-order")
    @RequiresPermission(anyOf = {Permissions.CONNECTION_BROWSE_SCHEMA, Permissions.PIPELINE_CREATE, Permissions.PIPELINE_EDIT})
    public ApiResponse<ValidateOrderResponse> validateOrder(@Valid @RequestBody ValidateOrderRequest request) {
        return ApiResponse.success(tableOrderService.validateOrder(request));
    }
}