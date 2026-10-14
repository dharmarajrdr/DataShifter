package com.datashifter.pipeline.services.interfaces;

import com.datashifter.common.dtos.CdcDtos.*;

public interface CdcCheckpointService {

    CdcCheckpointResponse getCheckpoint(String pipelineId);

    CdcCheckpointResponse resetCheckpoint(String pipelineId, ResetCdcCheckpointRequest request);

    void clearCheckpoint(String pipelineId);
}
