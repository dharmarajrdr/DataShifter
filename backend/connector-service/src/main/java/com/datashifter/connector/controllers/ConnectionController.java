package com.datashifter.connector.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.dtos.TableOrderDtos.*;
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
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ConnectionResponse> create(@Valid @RequestBody CreateConnectionRequest request) {
        return ApiResponse.success(connectionService.create(request), "Connection created");
    }

    @PutMapping("/{id}")
    public ApiResponse<ConnectionResponse> update(@PathVariable String id, @RequestBody UpdateConnectionRequest request) {
        return ApiResponse.success(connectionService.update(id, request), "Connection updated");
    }

    @GetMapping("/{id}")
    public ApiResponse<ConnectionResponse> getById(@PathVariable String id) {
        return ApiResponse.success(connectionService.getById(id));
    }

    @GetMapping
    public ApiResponse<List<ConnectionResponse>> getAll() {
        return ApiResponse.success(connectionService.getAll());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        connectionService.delete(id);
    }

    @PostMapping("/{id}/test")
    public ApiResponse<TestConnectionResponse> test(@PathVariable String id) {
        return ApiResponse.success(connectionService.testConnection(id));
    }

    @GetMapping("/{id}/tables")
    public ApiResponse<List<String>> listTables(@PathVariable String id) {
        return ApiResponse.success(connectionService.listTables(id));
    }

    @GetMapping("/{id}/tables/{tableName}")
    public ApiResponse<TableMetadata> getTableMetadata(@PathVariable String id, @PathVariable String tableName) {
        return ApiResponse.success(connectionService.getTableMetadata(id, tableName));
    }

    @GetMapping("/{id}/tables/{tableName}/foreign-keys")
    public ApiResponse<List<ForeignKeyMetadata>> getForeignKeys(@PathVariable String id, @PathVariable String tableName) {
        return ApiResponse.success(connectionService.getForeignKeys(id, tableName));
    }

    /* ===== Table dependency ordering ===== */

    @PostMapping("/smart-order")
    public ApiResponse<SmartOrderResponse> smartOrder(@Valid @RequestBody SmartOrderRequest request) {
        return ApiResponse.success(tableOrderService.smartOrder(request), "Smart order computed");
    }

    @PostMapping("/validate-order")
    public ApiResponse<ValidateOrderResponse> validateOrder(@Valid @RequestBody ValidateOrderRequest request) {
        return ApiResponse.success(tableOrderService.validateOrder(request));
    }
}