package com.datashifter.common.repositories;

import com.datashifter.common.enums.WorkflowStatus;
import com.datashifter.common.models.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommonWorkflowRepository extends JpaRepository<Workflow, String> {
    List<Workflow> findByOrgIdOrderByCreatedAtDesc(String orgId);
    long countByOrgId(String orgId);
    Optional<Workflow> findByIdAndOrgId(String id, String orgId);
    List<Workflow> findByStatus(WorkflowStatus status);
}

