package com.datashifter.auth.services;

import com.datashifter.auth.repositories.*;
import com.datashifter.common.dtos.AuthDtos.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrgService {

    private final OrgRepository orgRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuthService authService;
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;
    private final com.datashifter.common.services.SubscriptionLimitChecker limitChecker;
    private final com.datashifter.common.repositories.CommonPipelineRepository commonPipelineRepository;
    private final com.datashifter.common.repositories.CommonConnectionRepository commonConnectionRepository;
    private final com.datashifter.common.repositories.CommonExecutionLogRepository commonExecutionLogRepository;

    /**
     * Create a new org for an existing account (Path 3 onboarding).
     * Creates the org, seeds default roles, creates AppUser as Admin.
     */
    @Transactional
    public TokenResponse createOrg(String accountId, String orgName) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));

        String slug = orgName.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        String baseSlug = slug;
        int counter = 1;
        while (orgRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }

        Organization org = Organization.builder()
                .name(orgName).slug(slug).createdBy(account).build();
        orgRepository.save(org);

        Role adminRole = authService.seedDefaultRoles(org.getId());

        AppUser user = AppUser.builder()
                .account(account)
                .organization(org)
                .role(adminRole)
                .fullName(account.getEmail().split("@")[0])
                .displayInitials("??")
                .avatarColor("#534AB7")
                .isActive(true)
                .build();
        userRepository.save(user);

        log.info("Org created via onboard: {} (slug: {}) by account {}", orgName, slug, account.getEmail());
        return authService.generateTokenResponsePublic(account, user);
    }

    @Transactional(readOnly = true)
    public OrgResponse getOrg(String orgId) {
        Organization org = orgRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", orgId));
        long memberCount = userRepository.countByOrganization_IdAndIsActiveTrue(orgId);
        return OrgResponse.builder()
                .id(org.getId()).name(org.getName()).slug(org.getSlug())
                .logoUrl(org.getLogoUrl()).memberCount((int) memberCount)
                .createdAt(org.getCreatedAt()).build();
    }

    @Transactional(readOnly = true)
    public OrgQuotasResponse getOrgQuotas(String orgId) {
        var limits = limitChecker != null ? limitChecker.getLimits(orgId) : com.datashifter.common.services.SubscriptionLimitChecker.PlanLimits.FREE_TIER;
        boolean hasOrg = orgId != null && !orgId.isBlank();
        long pipelinesCount = (hasOrg && commonPipelineRepository != null) ? commonPipelineRepository.countByOrgId(orgId) : 0L;
        long connectionsCount = (hasOrg && commonConnectionRepository != null) ? commonConnectionRepository.countByOrgId(orgId) : 0L;
        Instant startOfMonth = Instant.now().minus(30, java.time.temporal.ChronoUnit.DAYS);
        long rowsMigrated = (hasOrg && commonExecutionLogRepository != null) ? commonExecutionLogRepository.sumRowsProcessedSince(orgId, startOfMonth) : 0L;

        List<QuotaItem> items = new java.util.ArrayList<>();

        int maxP = limits.getMaxPipelines();
        int pctP = maxP > 0 ? (int) Math.min(100, (pipelinesCount * 100) / maxP) : (maxP == -1 ? 0 : 100);
        items.add(QuotaItem.builder()
                .key("pipelines")
                .label("Pipelines Used")
                .current(String.valueOf(pipelinesCount))
                .max(maxP == -1 ? "Unlimited" : String.valueOf(maxP))
                .pct(pctP)
                .color("bg-indigo-600")
                .build());

        int maxC = limits.getMaxConnections();
        int pctC = maxC > 0 ? (int) Math.min(100, (connectionsCount * 100) / maxC) : (maxC == -1 ? 0 : 100);
        items.add(QuotaItem.builder()
                .key("connections")
                .label("Active Connections")
                .current(String.valueOf(connectionsCount))
                .max(maxC == -1 ? "Unlimited" : String.valueOf(maxC))
                .pct(pctC)
                .color("bg-indigo-600")
                .build());

        long maxR = limits.getMaxRowsPerMonth();
        int pctR = maxR > 0 ? (int) Math.min(100, (rowsMigrated * 100) / maxR) : (maxR == -1 ? 0 : 100);
        items.add(QuotaItem.builder()
                .key("rows")
                .label("Monthly Rows Migrated")
                .current(formatRows(rowsMigrated))
                .max(maxR == -1 ? "Unlimited" : formatRows(maxR))
                .pct(pctR)
                .color("bg-emerald-600")
                .build());

        return OrgQuotasResponse.builder()
                .planName(limits.getPlanName() != null ? limits.getPlanName() : "Enterprise")
                .quotas(items)
                .build();
    }

    private String formatRows(long rows) {
        if (rows >= 1_000_000_000) return String.format(java.util.Locale.US, "%.1fB", rows / 1_000_000_000.0).replace(".0B", "B");
        if (rows >= 1_000_000) return String.format(java.util.Locale.US, "%.1fM", rows / 1_000_000.0).replace(".0M", "M");
        if (rows >= 1_000) return String.format(java.util.Locale.US, "%.1fK", rows / 1_000.0).replace(".0K", "K");
        return String.valueOf(rows);
    }

    @Transactional
    public OrgResponse updateOrg(String orgId, UpdateOrgRequest request) {
        Organization org = orgRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", orgId));
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            org.setName(request.getName().trim());
        }
        if (request.getLogoUrl() != null) {
            org.setLogoUrl(request.getLogoUrl().trim().isEmpty() ? null : request.getLogoUrl().trim());
        }
        orgRepository.save(org);
        return getOrg(orgId);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getMembers(String orgId) {
        return userRepository.findByOrganization_IdAndIsActiveTrue(orgId).stream()
                .map(this::toUserResponse)
                .toList();
    }

    /**
     * Search members: returns up to `size` members matching search (alphabetical),
     * plus the current user if not already in the result set.
     */
    @Transactional(readOnly = true)
    public MembersPageResponse searchMembers(String orgId, String currentUserId, String search, int page, int size) {
        String searchTerm = (search == null || search.isBlank()) ? "" : search.trim();

        var pageable = org.springframework.data.domain.PageRequest.of(page, size);
        var resultPage = userRepository.searchByOrgId(orgId, searchTerm, pageable);

        List<UserResponse> members = resultPage.getContent().stream()
                .map(this::toUserResponse)
                .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));

        // Ensure current user is always in the list (first page, no search)
        if (page == 0 && searchTerm.isEmpty() && currentUserId != null) {
            boolean currentUserInList = members.stream().anyMatch(m -> m.getId().equals(currentUserId));
            if (!currentUserInList) {
                userRepository.findById(currentUserId).ifPresent(u -> {
                    if (u.getOrganization().getId().equals(orgId)) {
                        members.add(0, toUserResponse(u));
                    }
                });
            }
        }

        return MembersPageResponse.builder()
                .members(members)
                .totalMembers(resultPage.getTotalElements())
                .page(page)
                .totalPages(resultPage.getTotalPages())
                .build();
    }

    @Transactional
    public void updateMember(String userId, SetUserPermissionsRequest request) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Role", request.getRoleId()));
            if ( com.datashifter.common.enums.Permissions.AGENT_ROLE_NAME.equalsIgnoreCase(role.getName())) {
                throw new DatashifterException("The 'Agent' role is reserved for the AI Agent and cannot be assigned to users");
            }
            user.setRole(role);
        }

        if (request.getOverrides() != null) {
            user.getPermissionOverrides().clear();
            for (UserPermissionOverride override : request.getOverrides()) {
                user.getPermissionOverrides().add(UserPermission.builder()
                        .userId(user.getId())
                        .permission(override.getPermission())
                        .type(override.getType())
                        .build());
            }
        }

        userRepository.save(user);
        log.info("Member updated: {} — role={}", user.getAccount().getEmail(),
                user.getRole() != null ? user.getRole().getName() : "none");
    }

    @Transactional
    public void removeMember(String orgId, String callerUserId, String userId) {
        if (userId.equals(callerUserId)) {
            throw new IllegalArgumentException("You cannot remove yourself from the organization");
        }
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!user.getOrganization().getId().equals(orgId)) {
            throw new ResourceNotFoundException("User", userId);
        }
        // Soft delete / deactivate user in the organization
        user.setIsActive(false);
        userRepository.save(user);

        // Revoke active sessions immediately
        try {
            redisTemplate.opsForValue().set("auth:revoked:user:" + userId, "true", java.time.Duration.ofHours(24));
        } catch (Exception e) {
            log.warn("Failed to set revocation key in Redis for user {}: {}", userId, e.getMessage());
        }

        log.info("Member removed/deactivated: {} by {}", user.getAccount().getEmail(), callerUserId);
    }

    @Transactional
    public void deactivateMember(String userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        user.setIsActive(false);
        userRepository.save(user);

        // Revoke active sessions immediately
        try {
            redisTemplate.opsForValue().set("auth:revoked:user:" + userId, "true", java.time.Duration.ofHours(24));
        } catch (Exception e) {
            log.warn("Failed to set revocation key in Redis for user {}: {}", userId, e.getMessage());
        }

        log.info("Member deactivated: {}", user.getAccount().getEmail());
    }

    private UserResponse toUserResponse(AppUser user) {
        Account account = user.getAccount();
        String roleName = user.getRole() != null ? user.getRole().getName() : null;
        Set<String> perms = authService.getEffectivePermissions(user);
        return UserResponse.builder()
                .id(user.getId())
                .accountId(account.getId())
                .email(account.getEmail())
                .fullName(user.getFullName())
                .displayInitials(user.getDisplayInitials())
                .avatarColor(user.getAvatarColor())
                .orgId(user.getOrganization().getId())
                .orgName(user.getOrganization().getName())
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .roleName(roleName)
                .effectivePermissions(perms)
                .active(user.getIsActive())
                .emailVerified(account.getEmailVerified())
                .orgOwner(user.getOrganization().getCreatedBy() != null && user.getOrganization().getCreatedBy().getId().equals(account.getId()))
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .timezone(user.getTimezone())
                .build();
    }
}