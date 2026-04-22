package com.datashifter.common.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public class AuthDtos {
    private AuthDtos() {}

    // ================================================================
    // AUTH — signup, login, tokens
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SignupRequest {
        @NotBlank @Size(min = 2, max = 200) private String fullName;
        @NotBlank @Email private String email;
        @NotBlank @Size(min = 8, max = 100) private String password;
        private String orgName;
        private String inviteToken;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoginRequest {
        @NotBlank @Email private String email;
        @NotBlank private String password;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TokenResponse {
        private String accessToken;
        private String refreshToken;
        private long expiresIn;
        private String tokenType;
        private UserResponse user;
        /** All orgs this account belongs to — for org switcher */
        private List<OrgMembership> organizations;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RefreshTokenRequest {
        @NotBlank private String refreshToken;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SwitchOrgRequest {
        @NotBlank private String orgId;
    }

    // ================================================================
    // USER
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserResponse {
        private String id;           // AppUser.id (org-specific)
        private String accountId;    // Account.id (global)
        private String email;
        private String fullName;
        private String displayInitials;
        private String avatarColor;
        private String orgId;
        private String orgName;
        private String roleId;
        private String roleName;
        private Set<String> effectivePermissions;
        private boolean active;
        private boolean emailVerified;
        private Instant lastLoginAt;
        private Instant createdAt;
        private String timezone;
    }

    /** Lightweight org membership for org switcher */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OrgMembership {
        private String orgId;
        private String orgName;
        private String userId;
        private String roleName;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateUserRequest {
        private String fullName;
        private String avatarColor;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateProfileRequest {
        private String fullName;
        private String timezone;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChangePasswordRequest {
        @NotBlank(message = "Current password is required")
        private String currentPassword;
        @NotBlank(message = "New password is required")
        private String newPassword;
    }

    // ================================================================
    // ORGANIZATION
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OrgResponse {
        private String id;
        private String name;
        private String slug;
        private String logoUrl;
        private int memberCount;
        private Instant createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateOrgRequest {
        private String name;
        private String logoUrl;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateOrgRequest {
        @NotBlank private String name;
    }

    // ================================================================
    // ROLE MANAGEMENT
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RoleResponse {
        private String id;
        private String name;
        private String description;
        private boolean system;
        private List<String> permissions;
        private int memberCount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateRoleRequest {
        @NotBlank private String name;
        private String description;
        private List<String> permissions;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateRoleRequest {
        private String name;
        private String description;
        private List<String> permissions;
    }

    // ================================================================
    // USER PERMISSION OVERRIDES
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserPermissionOverride {
        @NotBlank private String permission;
        @NotBlank private String type;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SetUserPermissionsRequest {
        private String roleId;
        private List<UserPermissionOverride> overrides;
    }

    // ================================================================
    // INVITATION
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InviteRequest {
        @NotBlank @Email private String email;
        private String roleId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RequestAccessRequest {
        @NotBlank private String orgSlug;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InvitationResponse {
        private String id;
        private String email;
        private String roleName;
        private String orgName;
        private String inviteType;
        private String status;
        private String invitedByName;
        private Instant expiresAt;
        private Instant createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InvitationActionRequest {
        @NotBlank private String action;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MembersPageResponse {
        private List<UserResponse> members;
        private long totalMembers;
        private int page;
        private int totalPages;
    }
}