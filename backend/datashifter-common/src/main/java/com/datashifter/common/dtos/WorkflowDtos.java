package com.datashifter.common.dtos;

import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.enums.WorkflowFailureAction;
import com.datashifter.common.enums.WorkflowNodeOutcome;
import com.datashifter.common.enums.WorkflowStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.List;

public class WorkflowDtos {
    private WorkflowDtos() {}

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateWorkflowRequest {
        @NotBlank private String name;
        private String description;
        private String namespaceId;
        private List<WorkflowNodeInput> nodes;
        private List<WorkflowEdgeInput> edges;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateWorkflowRequest {
        private String name;
        private String description;
        private String namespaceId;
        private List<WorkflowNodeInput> nodes;
        private List<WorkflowEdgeInput> edges;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SaveWorkflowCanvasRequest {
        private List<WorkflowNodeInput> nodes;
        private List<WorkflowEdgeInput> edges;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AddWorkflowPipelinesRequest {
        private List<String> pipelineIds;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WorkflowNodeInput {
        @NotBlank private String pipelineId;
        private Double positionX;
        private Double positionY;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WorkflowEdgeInput {
        @NotBlank private String sourcePipelineId;
        @NotBlank private String targetPipelineId;
        private WorkflowFailureAction onFailureAction;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WorkflowNodeResponse {
        private String id;
        private String pipelineId;
        private String pipelineName;
        private String sourceName;
        private String targetName;
        private int tableCount;
        private PipelineStatus pipelineStatus;
        private WorkflowNodeOutcome lastRunOutcome;
        private Double positionX;
        private Double positionY;
        private double progress;
        private long rowsProcessed;
        private long totalRows;
        private long rowsPerSec;
        private long errorsSkipped;
        private String eta;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WorkflowEdgeResponse {
        private String id;
        private String sourcePipelineId;
        private String targetPipelineId;
        private WorkflowFailureAction onFailureAction;
    }

    public enum WorkflowAction {
        START, PAUSE, RESUME, STOP
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WorkflowActionRequest {
        private WorkflowAction action;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WorkflowResponse {
        private String id;
        private String orgId;
        private String namespaceId;
        private String namespaceName;
        private String name;
        private String description;
        private WorkflowStatus status;
        private String currentPipelineId;
        private boolean singleChainReady;
        private int chainCount;
        private double overallProgress;
        private long totalRowsProcessed;
        private long totalErrorsSkipped;
        private List<String> validationErrors;
        private List<WorkflowNodeResponse> nodes;
        private List<WorkflowEdgeResponse> edges;
        private String ownerName;
        private String ownerInitials;
        private String ownerColor;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WorkflowSummaryResponse {
        private String id;
        private String name;
        private String description;
        private String namespaceId;
        private String namespaceName;
        private WorkflowStatus status;
        private int pipelineCount;
        private int chainCount;
        private boolean singleChainReady;
        private List<String> orderedPipelineNames;
        private double progress;
        private String ownerName;
        private String ownerInitials;
        private String ownerColor;
        private Instant createdAt;
        private Instant updatedAt;
    }
}
