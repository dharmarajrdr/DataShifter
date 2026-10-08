package com.datashifter.udf.repositories;

import com.datashifter.common.models.UdfDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UdfDefinitionRepository extends JpaRepository<UdfDefinition, String> {
    List<UdfDefinition> findByOrganizationIdOrderByUpdatedAtDesc(String organizationId);
    boolean existsByOrganizationIdAndName(String organizationId, String name);
}