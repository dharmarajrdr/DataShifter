package com.datashifter.auth.services;

import com.datashifter.auth.repositories.*;
import com.datashifter.common.dtos.AuthDtos.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import com.datashifter.common.utils.JwtUtil;
import com.datashifter.common.utils.PermissionResolver;
import com.datashifter.common.utils.PermissionResolver.PermissionOverride;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final OrgRepository orgRepository;
    private final RoleRepository roleRepository;
    private final InvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;


    // =========================================================================
    // SIGNUP
    // =========================================================================

    @Transactional
    public TokenResponse signup(SignupRequest request) {
        if (accountRepository.existsByEmail(request.getEmail())) {
            throw new DatashifterException("Email already registered: " + request.getEmail());
        }

        Account account = Account.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .build();
        accountRepository.save(account);

        AppUser user = null;

        if (request.getInviteToken() != null && !request.getInviteToken().isBlank()) {
            user = handleInviteSignup(account, request);
        } else if (request.getOrgName() != null && !request.getOrgName().isBlank()) {
            user = handleNewOrgSignup(account, request);
        }

        log.info("Account created: {} (has org: {})", account.getEmail(), user != null);

        if (user != null) {
            return generateTokenResponse(account, user);
        }

        // No org yet — return minimal token
        return TokenResponse.builder()
                .accessToken(jwtUtil.generateAccessToken(null, account.getId(), account.getEmail(), null, null, Set.of()))
                .refreshToken(jwtUtil.generateRefreshToken(account.getId()))
                .expiresIn(jwtUtil.getAccessTokenExpiryMs() / 1000)
                .tokenType("Bearer")
                .user(UserResponse.builder().accountId(account.getId()).email(account.getEmail()).fullName(request.getFullName()).build())
                .organizations(List.of())
                .build();
    }

    // =========================================================================
    // LOGIN
    // =========================================================================

    @Transactional
    public TokenResponse login(LoginRequest request) {
        Account account = accountRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new DatashifterException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new DatashifterException("Invalid email or password");
        }

        if (!account.getIsActive()) {
            throw new DatashifterException("Account is disabled.");
        }

        account.setLastLoginAt(Instant.now());
        accountRepository.save(account);

        List<AppUser> memberships = userRepository.findByAccount_Id(account.getId());
        List<AppUser> activeMemberships = memberships.stream().filter(AppUser::getIsActive).toList();

        if (activeMemberships.isEmpty()) {
            return TokenResponse.builder()
                    .accessToken(jwtUtil.generateAccessToken(null, account.getId(), account.getEmail(), null, null, Set.of()))
                    .refreshToken(jwtUtil.generateRefreshToken(account.getId()))
                    .expiresIn(jwtUtil.getAccessTokenExpiryMs() / 1000)
                    .tokenType("Bearer")
                    .user(UserResponse.builder().accountId(account.getId()).email(account.getEmail()).build())
                    .organizations(List.of())
                    .build();
        }

        // Auto-select first active membership
        AppUser activeUser = activeMemberships.get(0);
        activeUser.setLastLoginAt(Instant.now());
        userRepository.save(activeUser);

        log.info("Login: {} → org {}", account.getEmail(), activeUser.getOrganization().getName());
        return generateTokenResponse(account, activeUser);
    }

    // =========================================================================
    // SWITCH ORG
    // =========================================================================

    @Transactional
    public TokenResponse switchOrg(String accountId, SwitchOrgRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));

        AppUser user = userRepository.findByAccount_IdAndOrganization_Id(accountId, request.getOrgId())
                .orElseThrow(() -> new DatashifterException("You are not a member of this organization"));

        if (!user.getIsActive()) {
            throw new DatashifterException("Your membership in this organization is disabled");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        log.info("Org switch: {} → org {}", account.getEmail(), user.getOrganization().getName());
        return generateTokenResponse(account, user);
    }

    // =========================================================================
    // TOKEN REFRESH — refreshToken sub = accountId
    // =========================================================================

    @Transactional(readOnly = true)
    public TokenResponse refreshToken(RefreshTokenRequest request) {
        if (!jwtUtil.isValid(request.getRefreshToken())) {
            throw new DatashifterException("Invalid or expired refresh token");
        }
        if (!"refresh".equals(jwtUtil.getTokenType(request.getRefreshToken()))) {
            throw new DatashifterException("Token is not a refresh token");
        }

        // Refresh token subject = accountId
        String accountId = jwtUtil.getUserId(request.getRefreshToken());
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new DatashifterException("Account not found"));

        List<AppUser> memberships = userRepository.findByAccount_Id(accountId);
        List<AppUser> activeMemberships = memberships.stream().filter(AppUser::getIsActive).toList();
        if (activeMemberships.isEmpty()) {
            return TokenResponse.builder()
                    .accessToken(jwtUtil.generateAccessToken(null, account.getId(), account.getEmail(), null, null, Set.of()))
                    .refreshToken(jwtUtil.generateRefreshToken(account.getId()))
                    .expiresIn(jwtUtil.getAccessTokenExpiryMs() / 1000)
                    .tokenType("Bearer")
                    .user(UserResponse.builder().accountId(account.getId()).email(account.getEmail()).build())
                    .organizations(List.of())
                    .build();
        }

        AppUser activeUser = activeMemberships.get(0);
        return generateTokenResponse(account, activeUser);
    }

    // =========================================================================
    // GET CURRENT USER
    // =========================================================================

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String userId, String accountId) {
        if (userId == null || userId.isBlank()) {
            if (accountId != null && !accountId.isBlank()) {
                Account account = accountRepository.findById(accountId)
                        .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));
                return UserResponse.builder()
                        .accountId(account.getId())
                        .email(account.getEmail())
                        .active(false)
                        .emailVerified(account.getEmailVerified())
                        .build();
            }
            throw new ResourceNotFoundException("User", "null");
        }
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new DatashifterException("Your membership in this organization has been deactivated");
        }
        return toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public List<OrgMembership> getOrgMemberships(String accountId) {
        return userRepository.findByAccount_Id(accountId).stream()
                .filter(AppUser::getIsActive)
                .map(u -> OrgMembership.builder()
                        .orgId(u.getOrganization().getId())
                        .orgName(u.getOrganization().getName())
                        .userId(u.getId())
                        .roleName(u.getRole() != null ? u.getRole().getName() : null)
                        .build())
                .toList();
    }

    // =========================================================================
    // UPDATE PROFILE
    // =========================================================================

    @Transactional
    public UserResponse updateProfile(String userId, UpdateProfileRequest req) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (req.getFullName() != null && !req.getFullName().isBlank()) {
            user.setFullName(req.getFullName());
            user.setDisplayInitials(computeInitials(req.getFullName()));
        }
        if (req.getTimezone() != null) {
            user.setTimezone(req.getTimezone());
        }

        userRepository.save(user);
        log.info("Profile updated for user: {}", user.getAccount().getEmail());
        return toUserResponse(user);
    }

    // =========================================================================
    // CHANGE PASSWORD — operates on Account
    // =========================================================================

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest req) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Account account = user.getAccount();

        if (!passwordEncoder.matches(req.getCurrentPassword(), account.getPasswordHash())) {
            throw new DatashifterException("Current password is incorrect");
        }

        account.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        accountRepository.save(account);
        log.info("Password changed for account: {}", account.getEmail());
    }

    // =========================================================================
    // FORGOT / RESET PASSWORD
    // =========================================================================

    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        accountRepository.findByEmail(req.getEmail()).ifPresent(account -> {
            String token = UUID.randomUUID().toString();
            account.setResetToken(token);
            account.setResetTokenExpiry(Instant.now().plus(1, java.time.temporal.ChronoUnit.HOURS));
            accountRepository.save(account);
            
            emailService.sendPasswordResetEmail(account.getEmail(), token);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        Account account = accountRepository.findByResetToken(req.getToken())
                .orElseThrow(() -> new DatashifterException("Invalid or expired reset token"));

        if (account.getResetTokenExpiry() == null || account.getResetTokenExpiry().isBefore(Instant.now())) {
            throw new DatashifterException("Reset token has expired");
        }

        account.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        account.setResetToken(null);
        account.setResetTokenExpiry(null);
        accountRepository.save(account);

        log.info("Password successfully reset for account {}", account.getEmail());
    }

    // =========================================================================
    // EFFECTIVE PERMISSIONS
    // =========================================================================

    @Transactional(readOnly = true)
    public Set<String> getEffectivePermissions(AppUser user) {
        if (user.getRole() == null) return Set.of();

        List<String> rolePerms = user.getRole().getPermissions().stream()
                .map(RolePermission::getPermission)
                .toList();

        List<PermissionOverride> overrides = user.getPermissionOverrides().stream()
                .map(up -> new PermissionOverride(up.getPermission(), up.getType()))
                .toList();

        return PermissionResolver.resolve(rolePerms, overrides);
    }

    // =========================================================================
    // PRIVATE — signup paths
    // =========================================================================

    private AppUser handleNewOrgSignup(Account account, SignupRequest request) {
        String slug = request.getOrgName().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");

        String baseSlug = slug;
        int counter = 1;
        while (orgRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }

        Organization org = Organization.builder()
                .name(request.getOrgName())
                .slug(slug)
                .createdBy(account)
                .build();
        orgRepository.save(org);

        Role adminRole = seedDefaultRoles(org.getId());

        AppUser user = AppUser.builder()
                .account(account)
                .organization(org)
                .role(adminRole)
                .fullName(request.getFullName())
                .displayInitials(computeInitials(request.getFullName()))
                .avatarColor(randomAvatarColor())
                .isActive(true)
                .build();
        userRepository.save(user);

        log.info("New org created: {} (slug: {})", request.getOrgName(), slug);
        return user;
    }

    private AppUser handleInviteSignup(Account account, SignupRequest request) {
        Invitation invite = invitationRepository.findByToken(request.getInviteToken())
                .orElseThrow(() -> new DatashifterException("Invalid invite token"));

        if (!"PENDING".equals(invite.getStatus())) {
            throw new DatashifterException("Invite has already been " + invite.getStatus().toLowerCase());
        }
        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(Instant.now())) {
            invite.setStatus("EXPIRED");
            invitationRepository.save(invite);
            throw new DatashifterException("Invite has expired");
        }

        Organization org = invite.getOrganization();
        Role role = invite.getRoleId() != null
                ? roleRepository.findById(invite.getRoleId()).orElse(null)
                : roleRepository.findByOrgIdAndName(org.getId(), "Viewer").orElse(null);

        AppUser user = userRepository.findByAccount_IdAndOrganization_Id(account.getId(), org.getId())
                .map(existing -> {
                    existing.setIsActive(true);
                    existing.setRole(role);
                    existing.setFullName(request.getFullName());
                    existing.setDisplayInitials(computeInitials(request.getFullName()));
                    return existing;
                })
                .orElseGet(() -> AppUser.builder()
                        .account(account)
                        .organization(org)
                        .role(role)
                        .fullName(request.getFullName())
                        .displayInitials(computeInitials(request.getFullName()))
                        .avatarColor(randomAvatarColor())
                        .isActive(true)
                        .build());
        userRepository.save(user);
        try {
            redisTemplate.delete("auth:revoked:user:" + user.getId());
        } catch (Exception e) {
            log.warn("Failed to delete revocation key in Redis for user {}: {}", user.getId(), e.getMessage());
        }

        invite.setStatus("ACCEPTED");
        invitationRepository.save(invite);

        log.info("User joined org {} via invite", org.getName());
        return user;
    }

    Role seedDefaultRoles(String orgId) {
        Role admin = Role.builder().orgId(orgId).name("Admin").description("Full access").isSystem(true).build();
        roleRepository.save(admin);
        for (String perm : Permissions.ALL) {
            admin.getPermissions().add(RolePermission.builder().roleId(admin.getId()).permission(perm).build());
        }
        roleRepository.save(admin);

        Role editor = Role.builder().orgId(orgId).name("Editor").description("Create and manage pipelines").isSystem(true).build();
        roleRepository.save(editor);
        for (String perm : Permissions.EDITOR) {
            editor.getPermissions().add(RolePermission.builder().roleId(editor.getId()).permission(perm).build());
        }
        roleRepository.save(editor);

        Role viewer = Role.builder().orgId(orgId).name("Viewer").description("Read-only access").isSystem(true).build();
        roleRepository.save(viewer);
        for (String perm : Permissions.VIEWER) {
            viewer.getPermissions().add(RolePermission.builder().roleId(viewer.getId()).permission(perm).build());
        }
        roleRepository.save(viewer);

        return admin;
    }

    // =========================================================================
    // PRIVATE — token generation
    // =========================================================================

    /** Package-accessible for OrgService.createOrg */
    TokenResponse generateTokenResponsePublic(Account account, AppUser user) {
        return generateTokenResponse(account, user);
    }

    private TokenResponse generateTokenResponse(Account account, AppUser user) {
        Set<String> perms = getEffectivePermissions(user);
        String roleName = user.getRole() != null ? user.getRole().getName() : null;
        String orgId = user.getOrganization().getId();

        String accessToken = jwtUtil.generateAccessToken(
                user.getId(), account.getId(), account.getEmail(), orgId, roleName, perms);
        String refreshToken = jwtUtil.generateRefreshToken(account.getId());

        List<OrgMembership> orgs = userRepository.findByAccount_Id(account.getId()).stream()
                .filter(AppUser::getIsActive)
                .map(u -> OrgMembership.builder()
                        .orgId(u.getOrganization().getId())
                        .orgName(u.getOrganization().getName())
                        .userId(u.getId())
                        .roleName(u.getRole() != null ? u.getRole().getName() : null)
                        .build())
                .toList();

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtUtil.getAccessTokenExpiryMs() / 1000)
                .tokenType("Bearer")
                .user(toUserResponse(user))
                .organizations(orgs)
                .build();
    }

    private UserResponse toUserResponse(AppUser user) {
        Account account = user.getAccount();
        Organization org = user.getOrganization();
        String roleName = user.getRole() != null ? user.getRole().getName() : null;

        return UserResponse.builder()
                .id(user.getId())
                .accountId(account.getId())
                .email(account.getEmail())
                .fullName(user.getFullName())
                .displayInitials(user.getDisplayInitials())
                .avatarColor(user.getAvatarColor())
                .orgId(org.getId())
                .orgName(org.getName())
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .roleName(roleName)
                .effectivePermissions(getEffectivePermissions(user))
                .active(user.getIsActive())
                .emailVerified(account.getEmailVerified())
                .orgOwner(org.getCreatedBy() != null && org.getCreatedBy().getId().equals(account.getId()))
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .timezone(user.getTimezone())
                .build();
    }

    private String computeInitials(String fullName) {
        if (fullName == null || fullName.isBlank()) return "?";
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        return (parts[0].charAt(0) + "" + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    private String randomAvatarColor() {
        String[] colors = {"#534AB7", "#1D9E75", "#D85A30", "#D4537E", "#378ADD", "#639922", "#BA7517"};
        return colors[new Random().nextInt(colors.length)];
    }
}
