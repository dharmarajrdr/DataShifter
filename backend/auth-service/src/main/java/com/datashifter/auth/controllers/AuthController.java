package com.datashifter.auth.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.AuthDtos.*;
import com.datashifter.auth.services.AuthService;
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
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TokenResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ApiResponse.success(authService.signup(request), "Account created");
    }

    @PostMapping("/login")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request), "Login successful");
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.success(null, "Password reset link sent to your email (if it exists)");
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.success(null, "Password successfully reset");
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.success(authService.refreshToken(request), "Token refreshed");
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(HttpServletRequest request) {
        String token = extractToken(request);
        String userId = jwtUtil.getUserId(token);
        String accountId = jwtUtil.getAccountId(token);
        return ApiResponse.success(authService.getCurrentUser(userId, accountId));
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateProfile(HttpServletRequest request, @RequestBody UpdateProfileRequest body) {
        String token = extractToken(request);
        String userId = jwtUtil.getUserId(token);
        return ApiResponse.success(authService.updateProfile(userId, body), "Profile updated");
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changePassword(HttpServletRequest request, @RequestBody ChangePasswordRequest body) {
        String token = extractToken(request);
        String userId = jwtUtil.getUserId(token);
        authService.changePassword(userId, body);
        return ApiResponse.success(null, "Password changed");
    }

    @PostMapping("/switch-org")
    public ApiResponse<TokenResponse> switchOrg(HttpServletRequest request, @Valid @RequestBody SwitchOrgRequest body) {
        String token = extractToken(request);
        String accountId = jwtUtil.getAccountId(token);
        return ApiResponse.success(authService.switchOrg(accountId, body), "Switched organization");
    }

    @GetMapping("/my-organizations")
    public ApiResponse<List<OrgMembership>> myOrganizations(HttpServletRequest request) {
        String token = extractToken(request);
        String accountId = jwtUtil.getAccountId(token);
        return ApiResponse.success(authService.getOrgMemberships(accountId));
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        throw new com.datashifter.common.exceptions.DatashifterException("Missing or invalid Authorization header");
    }
}
