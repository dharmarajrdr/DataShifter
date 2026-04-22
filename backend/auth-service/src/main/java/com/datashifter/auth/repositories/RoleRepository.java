package com.datashifter.auth.repositories;

import com.datashifter.common.models.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, String> {
    List<Role> findByOrgId(String orgId);
    Optional<Role> findByOrgIdAndName(String orgId, String name);
    boolean existsByOrgIdAndName(String orgId, String name);
}
