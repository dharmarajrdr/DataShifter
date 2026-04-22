package com.datashifter.pipeline.services.interfaces;

import com.datashifter.common.dtos.PipelineDtos.*;

import java.util.List;

public interface PipelineService {

    PipelineResponse create(CreatePipelineRequest request);

    PipelineResponse update(String id, UpdatePipelineRequest request);

    PipelineResponse getById(String id);

    List<PipelineSummaryResponse> getAll();

    void delete(String id);

    PipelineResponse performAction(String id, PipelineActionRequest action);

    /** Update table mappings (column mappings, transformations, filters) for a pipeline */
    PipelineResponse updateMappings(String pipelineId, List<PipelineTableRequest> tables);

    /** Add a new source→target table pair to a pipeline */
    PipelineResponse addTablePair(String pipelineId, AddTablePairRequest request);

    /** Remove a table pair from a pipeline */
    PipelineResponse removeTablePair(String pipelineId, String pipelineTableId);
}