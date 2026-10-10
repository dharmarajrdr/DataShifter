package com.datashifter.auth.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.AuthDtos.*;
import com.datashifter.auth.services.RoleService;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.RequiresPermission;
import com.datashifter.common.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;
    private final JwtUtil jwtUtil;

    @GetMapping
    @RequiresPermission(anyOf = {Permissions.ORG_MANAGE_ROLES, Permissions.ORG_MANAGE_MEMBERS})
    public ApiResponse<List<RoleResponse>> getAll(HttpServletRequest request) {
        String orgId = extractOrgId(request);
        return ApiResponse.success(roleService.getAllByOrg(orgId));
    }

    @GetMapping("/{id}")
    @RequiresPermission(anyOf = {Permissions.ORG_MANAGE_ROLES, Permissions.ORG_MANAGE_MEMBERS})
    public ApiResponse<RoleResponse> getById(@PathVariable String id) {
        return ApiResponse.success(roleService.getById(id));
    }

    @PostMapping
    @RequiresPermission(Permissions.ORG_MANAGE_ROLES)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RoleResponse> create(HttpServletRequest request, @Valid @RequestBody CreateRoleRequest body) {
        String orgId = extractOrgId(request);
        return ApiResponse.success(roleService.create(orgId, body), "Role created");
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permissions.ORG_MANAGE_ROLES)
    public ApiResponse<RoleResponse> update(@PathVariable String id, @RequestBody UpdateRoleRequest body) {
        return ApiResponse.success(roleService.update(id, body), "Role updated");
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permissions.ORG_MANAGE_ROLES)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        roleService.delete(id);
    }

    private String extractOrgId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.getOrgId(token);
    }
}