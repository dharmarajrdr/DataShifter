package com.datashifter.common.repositories;

import com.datashifter.common.models.UdfDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UdfDefinitionRepository extends JpaRepository<UdfDefinition, String> {
    List<UdfDefinition> findByOrganizationIdOrderByUpdatedAtDesc(String organizationId);
    boolean existsByOrganizationIdAndName(String organizationId, String name);
    Optional<UdfDefinition> findByOrganizationIdAndName(String organizationId, String name);
    Optional<UdfDefinition> findFirstByNameOrderByUpdatedAtDesc(String name);
}
