package com.datashifter.monitor.services.interfaces;

import com.datashifter.common.dtos.MonitorDtos.*;

import java.util.List;

public interface MonitorService {

    LiveMonitorResponse getLiveMonitor(String pipelineId);

    ErrorSummaryResponse getErrorSummary(String pipelineId, int page, int size);

    List<ExecutionLogResponse> getExecutionHistory(String pipelineId);

    void clearErrors(String pipelineId);
}