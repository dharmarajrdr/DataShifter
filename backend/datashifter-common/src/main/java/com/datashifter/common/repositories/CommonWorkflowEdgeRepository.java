package com.datashifter.common.repositories;

import com.datashifter.common.models.WorkflowEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommonWorkflowEdgeRepository extends JpaRepository<WorkflowEdge, String> {
    List<WorkflowEdge> findByWorkflow_Id(String workflowId);
    List<WorkflowEdge> findByWorkflow_IdAndSourcePipelineId(String workflowId, String sourcePipelineId);
    void deleteByWorkflow_Id(String workflowId);
}
