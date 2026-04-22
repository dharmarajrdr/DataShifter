package com.datashifter.auth.repositories;

import com.datashifter.common.models.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<AppUser, String> {
    List<AppUser> findByAccount_Id(String accountId);
    Optional<AppUser> findByAccount_IdAndOrganization_Id(String accountId, String orgId);
    boolean existsByAccount_IdAndOrganization_Id(String accountId, String orgId);
    Optional<AppUser> findByAccount_Email(String email);
    boolean existsByAccount_Email(String email);
    List<AppUser> findByOrganization_Id(String orgId);
    long countByOrganization_Id(String orgId);
    List<AppUser> findByRole_Id(String roleId);

    @org.springframework.data.jpa.repository.Query("""
        SELECT u FROM AppUser u
        WHERE u.organization.id = :orgId
          AND LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
        ORDER BY u.fullName ASC
    """)
    Page<AppUser> searchByOrgId(@Param("orgId") String orgId, @Param("search") String search, Pageable pageable);
}