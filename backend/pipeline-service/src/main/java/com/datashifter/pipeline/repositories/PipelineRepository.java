package com.datashifter.pipeline.repositories;

import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.models.Pipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PipelineRepository extends JpaRepository<Pipeline, String> {
    List<Pipeline> findByStatus(PipelineStatus status);
    List<Pipeline> findBySourceConnectionIdOrTargetConnectionId(String sourceId, String targetId);
    List<Pipeline> findByNamespaceId(String namespaceId);

    @Query("SELECT p FROM Pipeline p WHERE p.createdBy.organization.id = :orgId")
    List<Pipeline> findByOrgId(@Param("orgId") String orgId);

    @Query("SELECT p FROM Pipeline p WHERE p.name = :name AND p.createdBy.organization.id = :orgId")
    java.util.Optional<Pipeline> findByNameAndOrgId(@Param("name") String name, @Param("orgId") String orgId);
}
