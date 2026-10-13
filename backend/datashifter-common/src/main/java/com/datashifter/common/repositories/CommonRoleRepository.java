package com.datashifter.common.repositories;

import com.datashifter.common.models.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommonRoleRepository extends JpaRepository<Role, String> {
    Optional<Role> findByOrgIdAndNameIgnoreCase(String orgId, String name);
}

