package com.datashifter.auth.services;

import com.datashifter.auth.repositories.*;
import com.datashifter.common.dtos.AuthDtos.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllByOrg(String orgId) {
        return roleRepository.findByOrgId(orgId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse getById(String id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));
        return toResponse(role);
    }

    @Transactional
    public RoleResponse create(String orgId, CreateRoleRequest request) {
        if (roleRepository.existsByOrgIdAndName(orgId, request.getName())) {
            throw new DatashifterException("Role already exists: " + request.getName());
        }
        Role role = Role.builder()
                .orgId(orgId)
                .name(request.getName())
                .description(request.getDescription())
                .isSystem(false)
                .build();
        roleRepository.save(role);

        if (request.getPermissions() != null) {
            for (String perm : request.getPermissions()) {
                role.getPermissions().add(RolePermission.builder()
                        .roleId(role.getId()).permission(perm).build());
            }
            roleRepository.save(role);
        }

        log.info("Role created: {} in org {}", role.getName(), orgId);
        return toResponse(role);
    }

    @Transactional
    public RoleResponse update(String id, UpdateRoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));

        if (request.getName() != null && !request.getName().equals(role.getName())) {
            if (role.getIsSystem()) throw new DatashifterException("Cannot rename system role: " + role.getName());
            if (roleRepository.existsByOrgIdAndName(role.getOrgId(), request.getName())) {
                throw new DatashifterException("Role name taken: " + request.getName());
            }
            role.setName(request.getName());
        }
        if (request.getDescription() != null) role.setDescription(request.getDescription());

        if (request.getPermissions() != null) {
            role.getPermissions().clear();
            roleRepository.saveAndFlush(role); // flush deletes before re-inserting
            for (String perm : request.getPermissions()) {
                role.getPermissions().add(RolePermission.builder()
                        .roleId(role.getId()).permission(perm).build());
            }
        }

        roleRepository.save(role);
        log.info("Role updated: {}", role.getName());
        return toResponse(role);
    }

    @Transactional
    public void delete(String id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));
        if (role.getIsSystem()) throw new DatashifterException("Cannot delete system role: " + role.getName());

        List<AppUser> usersWithRole = userRepository.findByRole_Id(id);
        if (!usersWithRole.isEmpty()) {
            throw new DatashifterException("Cannot delete role with " + usersWithRole.size() + " assigned members. Reassign them first.");
        }

        roleRepository.delete(role);
        log.info("Role deleted: {}", role.getName());
    }

    private RoleResponse toResponse(Role role) {
        int memberCount = userRepository.findByRole_Id(role.getId()).size();
        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .system(role.getIsSystem())
                .permissions(role.getPermissions().stream().map(RolePermission::getPermission).toList())
                .memberCount(memberCount)
                .build();
    }
}