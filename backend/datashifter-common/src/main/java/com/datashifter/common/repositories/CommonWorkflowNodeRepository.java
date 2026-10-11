package com.datashifter.common.repositories;

import com.datashifter.common.models.WorkflowNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommonWorkflowNodeRepository extends JpaRepository<WorkflowNode, String> {
    Optional<WorkflowNode> findByPipelineId(String pipelineId);
    List<WorkflowNode> findByWorkflow_Id(String workflowId);
    void deleteByWorkflow_Id(String workflowId);

    @Query("SELECT wn FROM WorkflowNode wn JOIN FETCH wn.workflow WHERE wn.pipelineId = :pipelineId")
    Optional<WorkflowNode> findByPipelineIdWithWorkflow(@Param("pipelineId") String pipelineId);

    @Query("SELECT wn FROM WorkflowNode wn JOIN FETCH wn.workflow WHERE wn.pipelineId IN :pipelineIds")
    List<WorkflowNode> findByPipelineIdInWithWorkflow(@Param("pipelineIds") Collection<String> pipelineIds);
}
