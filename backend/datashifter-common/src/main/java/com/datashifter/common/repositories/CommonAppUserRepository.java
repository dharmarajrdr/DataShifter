package com.datashifter.common.repositories;

import com.datashifter.common.models.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommonAppUserRepository extends JpaRepository<AppUser, String> {

    List<AppUser> findByOrganization_IdAndIsActiveTrueOrderByFullNameAsc(String orgId);

    List<AppUser> findByIdInAndOrganization_Id(Collection<String> ids, String orgId);

    Optional<AppUser> findByIdAndOrganization_Id(String id, String orgId);
}

