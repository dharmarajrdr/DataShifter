package com.datashifter.execution.contexts;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TransformationExecutionContext {
    private String pipelineId;
    private String executionLogId;
    private String sourceTable;
    private String targetTable;
    private long chunkNumber;
}
