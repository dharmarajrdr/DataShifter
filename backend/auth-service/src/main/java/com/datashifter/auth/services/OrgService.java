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
        long memberCount = userRepository.countByOrganization_Id(orgId);
        return OrgResponse.builder()
                .id(org.getId()).name(org.getName()).slug(org.getSlug())
                .logoUrl(org.getLogoUrl()).memberCount((int) memberCount)
                .createdAt(org.getCreatedAt()).build();
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
        return userRepository.findByOrganization_Id(orgId).stream()
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
            if (!roleRepository.existsById(request.getRoleId())) {
                throw new ResourceNotFoundException("Role", request.getRoleId());
            }
            Role role = roleRepository.findById(request.getRoleId()).orElse(null);
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
    public void deactivateMember(String userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        user.setIsActive(false);
        userRepository.save(user);
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