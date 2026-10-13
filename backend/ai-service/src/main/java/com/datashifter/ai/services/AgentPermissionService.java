package com.datashifter.ai.services;

import com.datashifter.common.dtos.AiDtos.PlanStepDto;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.AppUser;
import com.datashifter.common.models.Role;
import com.datashifter.common.models.RolePermission;
import com.datashifter.common.repositories.CommonAppUserRepository;
import com.datashifter.common.repositories.CommonRoleRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.utils.PermissionResolver;
import com.datashifter.common.utils.PermissionResolver.PermissionOverride;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentPermissionService {

    private final CommonRoleRepository roleRepository;
    private final CommonAppUserRepository appUserRepository;

    public record AgentPolicySnapshot(
            boolean agentRolePresent,
            Set<String> agentRolePermissions,
            Set<String> userPermissions,
            Set<String> effectivePermissions
    ) {
        public boolean isAllowed(String permission) {
            return agentRolePresent && effectivePermissions.contains(permission);
        }
    }

    @Transactional(readOnly = true)
    public AgentPolicySnapshot resolveCurrentPolicy() {
        String orgId = UserContext.getCurrentOrgId();
        String userId = UserContext.getCurrentUserId();
        if (orgId == null || orgId.isBlank()) {
            return new AgentPolicySnapshot(false, Set.of(), Set.of(), Set.of());
        }

        Optional<Role> agentRoleOpt = roleRepository.findByOrgIdAndNameIgnoreCase(orgId, Permissions.AGENT_ROLE_NAME);
        if (agentRoleOpt.isEmpty()) {
            return new AgentPolicySnapshot(false, Set.of(), resolveUserPermissions(userId), Set.of());
        }

        Role agentRole = agentRoleOpt.get();
        Set<String> agentPerms = agentRole.getPermissions() == null
                ? Set.of()
                : agentRole.getPermissions().stream()
                        .map(RolePermission::getPermission)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toCollection(LinkedHashSet::new));

        Set<String> userPerms = resolveUserPermissions(userId);

        Set<String> effective = agentPerms.stream()
                .filter(userPerms::contains)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return new AgentPolicySnapshot(true, agentPerms, userPerms, effective);
    }

    private Set<String> resolveUserPermissions(String userId) {
        if (userId != null && !userId.isBlank()) {
            Optional<AppUser> userOpt = appUserRepository.findById(userId);
            if (userOpt.isPresent()) {
                AppUser user = userOpt.get();
                if (user.getRole() != null) {
                    List<String> rolePerms = user.getRole().getPermissions() == null
                            ? List.of()
                            : user.getRole().getPermissions().stream()
                                    .map(RolePermission::getPermission)
                                    .toList();
                    List<PermissionOverride> overrides = user.getPermissionOverrides() == null
                            ? List.of()
                            : user.getPermissionOverrides().stream()
                                    .map(up -> new PermissionOverride(up.getPermission(), up.getType()))
                                    .toList();
                    return PermissionResolver.resolve(rolePerms, overrides);
                }
            }
        }
        UserContext.Context ctx = UserContext.getCurrent();
        return ctx != null && ctx.getPermissions() != null ? ctx.getPermissions() : Set.of();
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(String permission) {
        return resolveCurrentPolicy().isAllowed(permission);
    }

    @Transactional(readOnly = true)
    public void assertPermission(String permission) {
        AgentPolicySnapshot snapshot = resolveCurrentPolicy();
        if (!snapshot.agentRolePresent()) {
            throw new DatashifterException(
                    "Org policy restricts this action. The system 'Agent' role is not configured for this organization.");
        }
        if (!snapshot.agentRolePermissions().contains(permission)) {
            throw new DatashifterException(
                    "Org policy restricts this action. The 'Agent' role does not have the '" + permission + "' permission.");
        }
        if (!snapshot.userPermissions().contains(permission)) {
            throw new DatashifterException(
                    "Org policy restricts this action. Your account does not have the '" + permission + "' permission.");
        }
    }

    public String getRequiredPermissionForStep(PlanStepDto step) {
        if (step == null || step.getActionType() == null) {
            return null;
        }
        String actionType = step.getActionType().trim().toUpperCase();
        Map<String, Object> params = step.getParameters() != null ? step.getParameters() : Map.of();

        return switch (actionType) {
            case "CREATE_NAMESPACE" -> Permissions.NAMESPACE_CREATE;
            case "DELETE_NAMESPACE" -> Permissions.NAMESPACE_DELETE;
            case "CREATE_CONNECTION" -> Permissions.CONNECTION_CREATE;
            case "UPDATE_CONNECTION" -> Permissions.CONNECTION_EDIT;
            case "DELETE_CONNECTION" -> Permissions.CONNECTION_DELETE;
            case "CREATE_PIPELINE", "IMPORT_PIPELINE" -> Permissions.PIPELINE_CREATE;
            case "UPDATE_PIPELINE_SETTINGS" -> Permissions.SETTINGS_EDIT;
            case "UPDATE_PIPELINE", "RENAME_PIPELINE", "ADD_TABLE_PAIR", "REMOVE_TABLE_PAIR",
                 "UPDATE_MAPPINGS", "VALIDATE_PIPELINE" -> Permissions.PIPELINE_EDIT;
            case "DELETE_PIPELINE" -> Permissions.PIPELINE_DELETE;
            case "PIPELINE_ACTION", "RUN_PIPELINE" -> {
                String actStr = String.valueOf(params.getOrDefault("action", "START")).trim().toUpperCase();
                yield switch (actStr) {
                    case "PAUSE" -> Permissions.PIPELINE_PAUSE;
                    case "STOP" -> Permissions.PIPELINE_STOP;
                    case "VALIDATE" -> Permissions.PIPELINE_EDIT;
                    default -> Permissions.PIPELINE_RUN;
                };
            }
            case "CREATE_WORKFLOW" -> Permissions.WORKFLOW_CREATE;
            case "UPDATE_WORKFLOW", "RENAME_WORKFLOW", "UPDATE_WORKFLOW_CANVAS",
                 "ADD_WORKFLOW_PIPELINES", "REMOVE_WORKFLOW_PIPELINE" -> Permissions.WORKFLOW_EDIT;
            case "DELETE_WORKFLOW" -> Permissions.WORKFLOW_DELETE;
            case "WORKFLOW_ACTION", "RUN_WORKFLOW" -> {
                String actStr = String.valueOf(params.getOrDefault("action", "START")).trim().toUpperCase();
                yield switch (actStr) {
                    case "PAUSE" -> Permissions.WORKFLOW_PAUSE;
                    case "STOP" -> Permissions.WORKFLOW_STOP;
                    default -> Permissions.WORKFLOW_RUN;
                };
            }
            case "DELETE_UDF" -> Permissions.UDF_DELETE;
            case "CLEAR_ERRORS" -> Permissions.MONITOR_VIEW_ERRORS;
            default -> null;
        };
    }

    @Transactional(readOnly = true)
    public void assertStepPermission(PlanStepDto step) {
        AgentPolicySnapshot snapshot = resolveCurrentPolicy();
        if (!snapshot.agentRolePresent() || snapshot.effectivePermissions().isEmpty()) {
            throw new DatashifterException(
                    "Org policy restricts this action. The 'Agent' role has no active permissions.");
        }
        String requiredPerm = getRequiredPermissionForStep(step);
        if (requiredPerm != null) {
            if (!snapshot.agentRolePermissions().contains(requiredPerm)) {
                throw new DatashifterException(
                        "Org policy restricts this action. The 'Agent' role does not have permission '" + requiredPerm + "'.");
            }
            if (!snapshot.userPermissions().contains(requiredPerm)) {
                throw new DatashifterException(
                        "Org policy restricts this action. Your account does not have permission '" + requiredPerm + "'.");
            }
        }
    }

    @Transactional(readOnly = true)
    public Optional<String> validatePlanPermissions(List<PlanStepDto> steps) {
        AgentPolicySnapshot snapshot = resolveCurrentPolicy();
        if (!snapshot.agentRolePresent()) {
            return Optional.of("Org policy restricts this action. The system **Agent** role is missing in this organization, so the agent cannot perform any actions across the platform.");
        }
        if (snapshot.effectivePermissions().isEmpty()) {
            return Optional.of("Org policy restricts this action. No permissions are currently enabled for the **Agent** role (or your account).");
        }
        if (steps == null || steps.isEmpty()) {
            return Optional.empty();
        }
        for (PlanStepDto step : steps) {
            String requiredPerm = getRequiredPermissionForStep(step);
            if (requiredPerm == null) continue;
            if (!snapshot.agentRolePermissions().contains(requiredPerm)) {
                return Optional.of("Org policy restricts this action. The **Agent** role does not have the `"
                        + requiredPerm + "` permission required for **" + step.getTitle() + "**.");
            }
            if (!snapshot.userPermissions().contains(requiredPerm)) {
                return Optional.of("Org policy restricts this action. Your account does not have the `"
                        + requiredPerm + "` permission required for **" + step.getTitle() + "**.");
            }
        }
        return Optional.empty();
    }

    @Transactional(readOnly = true)
    public String buildPolicyPromptSection() {
        AgentPolicySnapshot snapshot = resolveCurrentPolicy();
        StringBuilder sb = new StringBuilder();
        sb.append("\n### Organization Agent Role Policy & Permissions\n");
        if (!snapshot.agentRolePresent()) {
            sb.append("- **CRITICAL**: The system `Agent` role does not exist for this organization. You CANNOT perform ANY actions across the platform.\n");
            sb.append("- For any action request, reply: `Org policy restricts this action.`\n");
            return sb.toString();
        }

        List<String> restrictedByAgentRole = Permissions.AGENT.stream()
                .filter(p -> !snapshot.agentRolePermissions().contains(p))
                .toList();
        List<String> restrictedByUserRole = Permissions.AGENT.stream()
                .filter(p -> snapshot.agentRolePermissions().contains(p) && !snapshot.userPermissions().contains(p))
                .toList();

        sb.append("- **Effective Allowed Permissions**: ")
                .append(snapshot.effectivePermissions().isEmpty()
                        ? "(NONE — all actions are restricted)"
                        : String.join(", ", snapshot.effectivePermissions()))
                .append("\n");

        if (!restrictedByAgentRole.isEmpty()) {
            sb.append("- **Restricted by 'Agent' System Role (Org Policy)**: ")
                    .append(String.join(", ", restrictedByAgentRole))
                    .append("\n");
        }
        if (!restrictedByUserRole.isEmpty()) {
            sb.append("- **Restricted by Requesting User's Role**: ")
                    .append(String.join(", ", restrictedByUserRole))
                    .append("\n");
        }

        sb.append("""
                - **STRICT ORG POLICY ENFORCEMENT RULE**:
                  - Before answering or creating any `<BEETEL_PLAN>`, check if the requested operation requires any permission listed under **Restricted by 'Agent' System Role (Org Policy)** or **Restricted by Requesting User's Role** (for example: `DELETE_PIPELINE` requires `pipeline:delete`, `DELETE_WORKFLOW` requires `workflow:delete`, `DELETE_CONNECTION` requires `connection:delete`, `DELETE_UDF` requires `udf:delete`, `CREATE_PIPELINE` requires `pipeline:create`, `UPDATE_PIPELINE` requires `pipeline:edit`, etc.).
                  - If the required permission is restricted (not in **Effective Allowed Permissions**), **DO NOT generate a `<BEETEL_PLAN>` block**. Instead, respond clearly with: **"Org policy restricts this action."** and state which permission (e.g., `pipeline:delete`) is disabled for the `Agent` role.
                """);
        return sb.toString();
    }
}

