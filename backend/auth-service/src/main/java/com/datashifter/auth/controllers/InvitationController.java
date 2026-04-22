package com.datashifter.auth.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.AuthDtos.*;
import com.datashifter.auth.services.InvitationService;
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
public class InvitationController {

    private final InvitationService invitationService;
    private final JwtUtil jwtUtil;

    @GetMapping("/invitations")
    public ApiResponse<List<InvitationResponse>> getPending(HttpServletRequest request) {
        return ApiResponse.success(invitationService.getPending(extractOrgId(request)));
    }

    @PostMapping("/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<InvitationResponse> sendInvite(HttpServletRequest request, @Valid @RequestBody InviteRequest body) {
        String orgId = extractOrgId(request);
        String userId = extractUserId(request);
        return ApiResponse.success(invitationService.sendInvite(orgId, userId, body), "Invitation sent");
    }

    @PostMapping("/invitations/{id}")
    public ApiResponse<Void> handleInvitation(@PathVariable String id, @Valid @RequestBody InvitationActionRequest body) {
        invitationService.handleInvitation(id, body.getAction());
        return ApiResponse.success(null, "Invitation " + body.getAction().toLowerCase() + "ed");
    }

    @GetMapping("/my-invitations")
    public ApiResponse<List<InvitationResponse>> getMyInvitations(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        String email = jwtUtil.getEmail(token);
        return ApiResponse.success(invitationService.getByEmail(email));
    }

    @PostMapping("/request-access")
    public ApiResponse<InvitationResponse> requestAccess(HttpServletRequest request, @Valid @RequestBody RequestAccessRequest body) {
        String userId = extractUserId(request);
        return ApiResponse.success(invitationService.requestAccess(userId, body), "Access request sent");
    }

    private String extractOrgId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.getOrgId(token);
    }

    private String extractUserId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.getUserId(token);
    }
}