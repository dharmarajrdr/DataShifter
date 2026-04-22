package com.datashifter.auth.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.AuthDtos.*;
import com.datashifter.auth.services.OrgService;
import com.datashifter.common.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class OrgController {

    private final OrgService orgService;
    private final JwtUtil jwtUtil;

    /** Create a new org — for accounts that signed up without an org (Path 3 onboarding) */
    @PostMapping("/orgs")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TokenResponse> createOrg(HttpServletRequest request, @RequestBody CreateOrgRequest body) {
        String token = request.getHeader("Authorization").substring(7);
        String accountId = jwtUtil.getAccountId(token);
        return ApiResponse.success(orgService.createOrg(accountId, body.getName()), "Organization created");
    }

    @GetMapping("/org")
    public ApiResponse<OrgResponse> getOrg(HttpServletRequest request) {
        return ApiResponse.success(orgService.getOrg(extractOrgId(request)));
    }

    @PutMapping("/org")
    public ApiResponse<OrgResponse> updateOrg(HttpServletRequest request, @RequestBody UpdateOrgRequest body) {
        return ApiResponse.success(orgService.updateOrg(extractOrgId(request), body), "Organization updated");
    }

    @GetMapping("/members")
    public ApiResponse<MembersPageResponse> getMembers(
            HttpServletRequest request,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size) {
        String token = request.getHeader("Authorization").substring(7);
        String orgId = jwtUtil.getOrgId(token);
        String userId = jwtUtil.getUserId(token);
        return ApiResponse.success(orgService.searchMembers(orgId, userId, search, page, size));
    }

    @PutMapping("/members/{userId}")
    public ApiResponse<Void> updateMember(@PathVariable String userId, @RequestBody SetUserPermissionsRequest body) {
        orgService.updateMember(userId, body);
        return ApiResponse.success(null, "Member updated");
    }

    @DeleteMapping("/members/{userId}")
    public ApiResponse<Void> deactivateMember(@PathVariable String userId) {
        orgService.deactivateMember(userId);
        return ApiResponse.success(null, "Member deactivated");
    }

    private String extractOrgId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.getOrgId(token);
    }
}