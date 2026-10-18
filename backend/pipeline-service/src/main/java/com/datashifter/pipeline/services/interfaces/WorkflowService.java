package com.datashifter.pipeline.services.interfaces;

import com.datashifter.common.dtos.PipelineDtos.PipelineSummaryResponse;
import com.datashifter.common.dtos.WorkflowDtos.*;

import java.util.List;

public interface WorkflowService {

    WorkflowResponse create(CreateWorkflowRequest request);

    WorkflowResponse update(String id, UpdateWorkflowRequest request);

    WorkflowResponse saveCanvas(String id, SaveWorkflowCanvasRequest request);

    WorkflowResponse addPipelines(String id, AddWorkflowPipelinesRequest request);

    WorkflowResponse removePipeline(String id, String pipelineId);

    WorkflowResponse getById(String id);

    List<WorkflowSummaryResponse> getAll();

    List<PipelineSummaryResponse> getEligiblePipelines(String workflowId);

    void delete(String id);

    WorkflowResponse performAction(String id, WorkflowActionRequest action);

    WorkflowResponse validatePipelines(String id);

    void syncWorkflowStatusForPipeline(String pipelineId);
}

