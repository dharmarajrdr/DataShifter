package com.datashifter.auth.services;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datashifter.auth.repositories.AccountRepository;
import com.datashifter.auth.repositories.InvitationRepository;
import com.datashifter.auth.repositories.OrgRepository;
import com.datashifter.auth.repositories.RoleRepository;
import com.datashifter.auth.repositories.UserRepository;
import com.datashifter.common.dtos.AuthDtos.InvitationResponse;
import com.datashifter.common.dtos.AuthDtos.InviteRequest;
import com.datashifter.common.dtos.AuthDtos.RequestAccessRequest;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.Account;
import com.datashifter.common.models.AppUser;
import com.datashifter.common.models.Invitation;
import com.datashifter.common.models.Organization;
import com.datashifter.common.models.Role;
import com.datashifter.common.services.SubscriptionLimitChecker;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final OrgRepository orgRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EntityManager entityManager;
    private final SubscriptionLimitChecker limitChecker;
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @Transactional(readOnly = true)
    public List<InvitationResponse> getPending(String orgId) {
        return invitationRepository.findByOrganization_IdAndStatus(orgId, "PENDING").stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public InvitationResponse sendInvite(String orgId, String invitedByUserId, InviteRequest request) {
        // Enforce member limit
        long currentMembers = userRepository.countByOrganization_IdAndIsActiveTrue(orgId);
        limitChecker.assertCanAddMember(orgId, currentMembers);

        // Check if already an active member via account
        accountRepository.findByEmail(request.getEmail()).ifPresent(account -> {
            userRepository.findByAccount_IdAndOrganization_Id(account.getId(), orgId).ifPresent(user -> {
                if (Boolean.TRUE.equals(user.getIsActive())) {
                    throw new DatashifterException("User is already a member: " + request.getEmail());
                }
            });
        });

        invitationRepository.findByEmailAndOrganization_IdAndStatus(request.getEmail(), orgId, "PENDING")
                .ifPresent(existing -> {
                    throw new DatashifterException("Pending invite already exists for " + request.getEmail());
                });

        String roleId = request.getRoleId();
        if (roleId != null && !roleRepository.existsById(roleId)) {
            throw new ResourceNotFoundException("Role", roleId);
        }

        Organization organization = entityManager.getReference(Organization.class, orgId);

        Invitation invite = Invitation.builder()
                .organization(organization)
                .email(request.getEmail())
                .roleId(roleId)
                .inviteType("INVITE")
                .status("PENDING")
                .token(UUID.randomUUID().toString())
                .invitedBy(invitedByUserId)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();
        invitationRepository.save(invite);

        log.info("Invite sent: {} → org {}", request.getEmail(), orgId);
        return toResponse(invite);
    }

    @Transactional
    public InvitationResponse requestAccess(String userId, RequestAccessRequest request) {
        Organization org = orgRepository.findBySlug(request.getOrgSlug())
                .orElseThrow(() -> new DatashifterException("Organization not found: " + request.getOrgSlug()));

        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        String email = user.getAccount().getEmail();

        if (userRepository.existsByAccount_IdAndOrganization_Id(user.getAccount().getId(), org.getId())) {
            throw new DatashifterException("You are already a member of this organization");
        }

        invitationRepository.findByEmailAndOrganization_IdAndStatus(email, org.getId(), "PENDING")
                .ifPresent(existing -> {
                    throw new DatashifterException("You already have a pending request");
                });

        Invitation req = Invitation.builder()
                .organization(org)
                .email(email)
                .inviteType("REQUEST")
                .status("PENDING")
                .token(UUID.randomUUID().toString())
                .build();
        invitationRepository.save(req);

        log.info("Access request: {} → org {}", email, org.getSlug());
        return toResponse(req);
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> getByEmail(String email) {
        return invitationRepository.findByEmailAndStatus(email, "PENDING").stream().map(this::toResponse).toList();
    }

    @Transactional
    public void handleInvitation(String invitationId, String action) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation", invitationId));

        if (!"PENDING".equals(invitation.getStatus())) {
            throw new DatashifterException("Invitation is no longer pending");
        }

        if ("ACCEPT".equals(action)) {
            Organization org = invitation.getOrganization();
            Account account = accountRepository.findByEmail(invitation.getEmail()).orElse(null);

            if (account != null) {
                Role role = invitation.getRoleId() != null
                        ? roleRepository.findById(invitation.getRoleId()).orElse(null)
                        : null;
                if (role == null) {
                    role = roleRepository.findByOrgIdAndName(org.getId(), "Viewer").orElse(null);
                }

                Optional<AppUser> existingUserOpt = userRepository.findByAccount_IdAndOrganization_Id(account.getId(),
                        org.getId());
                if (existingUserOpt.isPresent()) {
                    AppUser existingUser = existingUserOpt.get();
                    if (Boolean.TRUE.equals(existingUser.getIsActive())) {
                        throw new DatashifterException("Already a member of this organization");
                    }
                    existingUser.setIsActive(true);
                    existingUser.setRole(role);
                    userRepository.save(existingUser);
                    try {
                        redisTemplate.delete("auth:revoked:user:" + existingUser.getId());
                    } catch (Exception e) {
                        log.warn("Failed to delete revocation key in Redis for user {}: {}", existingUser.getId(), e.getMessage());
                    }
                    log.info("User {} re-activated in org {} via invitation", account.getEmail(), org.getName());
                } else {
                    // Create new User record for this account in this org
                    AppUser newUser = AppUser.builder()
                            .account(account)
                            .organization(org)
                            .role(role)
                            .fullName(account.getEmail().split("@")[0]) // default name from email
                            .displayInitials(computeInitials(account.getEmail().split("@")[0]))
                            .avatarColor(randomAvatarColor())
                            .isActive(true)
                            .build();
                    userRepository.save(newUser);
                    log.info("User {} joined org {} via invitation", account.getEmail(), org.getName());
                }
            }

            invitation.setStatus("ACCEPTED");
        } else if ("REJECT".equals(action)) {
            invitation.setStatus("REJECTED");
            log.info("Invitation rejected: {}", invitation.getEmail());
        } else {
            throw new DatashifterException("Invalid action: " + action + ". Expected ACCEPT or REJECT.");
        }

        invitationRepository.save(invitation);
    }

    private InvitationResponse toResponse(Invitation inv) {
        String roleName = inv.getRoleId() != null
                ? roleRepository.findById(inv.getRoleId()).map(Role::getName).orElse(null)
                : null;
        String invitedByName = inv.getInvitedBy() != null
                ? userRepository.findById(inv.getInvitedBy()).map(AppUser::getFullName).orElse(null)
                : null;
        return InvitationResponse.builder()
                .orgName(inv.getOrganization().getName())
                .id(inv.getId()).email(inv.getEmail()).roleName(roleName)
                .inviteType(inv.getInviteType()).status(inv.getStatus())
                .invitedByName(invitedByName).expiresAt(inv.getExpiresAt())
                .createdAt(inv.getCreatedAt()).build();
    }

    private String computeInitials(String name) {
        if (name == null || name.isBlank())
            return "?";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1)
            return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        return (parts[0].charAt(0) + "" + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    private String randomAvatarColor() {
        String[] colors = { "#534AB7", "#1D9E75", "#D85A30", "#D4537E", "#378ADD", "#639922", "#BA7517" };
        return colors[new Random().nextInt(colors.length)];
    }
}