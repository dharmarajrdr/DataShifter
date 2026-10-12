package com.datashifter.ai.advisors;

import com.datashifter.ai.spi.BeetelContextAdvisor;
import com.datashifter.common.dtos.MonitorDtos.ErrorSummaryResponse;
import com.datashifter.common.dtos.PipelineDtos.PipelineResponse;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowResponse;
import com.datashifter.common.enums.AiContextType;
import com.datashifter.monitor.services.interfaces.MonitorService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EntityContextAdvisor implements BeetelContextAdvisor {

    private final PipelineService pipelineService;
    private final WorkflowService workflowService;
    private final MonitorService monitorService;
    private final ObjectMapper objectMapper;

    @Override
    public int getOrder() {
        return 10;
    }

    @Override
    public String buildContextSection(String userMessage, AiContextType contextType, String contextId) {
        if (contextType == null || contextType == AiContextType.NONE || contextId == null || contextId.isBlank()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        try {
            if (contextType == AiContextType.PIPELINE) {
                PipelineResponse pipeline = pipelineService.getById(contextId);
                ErrorSummaryResponse errors = monitorService.getErrorSummary(contextId, 0, 10);
                sb.append("### Active Pipeline Context (`").append(pipeline.getName()).append("`, ID: `").append(pipeline.getId()).append("`)\n");
                sb.append("- **Status**: `").append(pipeline.getStatus()).append("`\n");
                sb.append("- **Source Connection ID**: `").append(pipeline.getSourceConnectionId()).append("`\n");
                sb.append("- **Target Connection ID**: `").append(pipeline.getTargetConnectionId()).append("`\n");
                sb.append("- **Default Write Mode**: `").append(pipeline.getDefaultWriteMode()).append("`, **Chunk Size**: `").append(pipeline.getChunkSize()).append("`\n");
                if (pipeline.getValidationErrors() != null && !pipeline.getValidationErrors().isEmpty()) {
                    sb.append("- **Validation Errors**: ").append(String.join("; ", pipeline.getValidationErrors())).append("\n");
                }
                sb.append("- **Configured Tables & Column Mappings**:\n```json\n")
                        .append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(pipeline.getTables()))
                        .append("\n```\n");
                if (errors != null && errors.getTotalErrors() > 0) {
                    sb.append("- **Recent Execution Errors (Total: ").append(errors.getTotalErrors()).append(")**:\n```json\n")
                            .append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(errors.getErrors()))
                            .append("\n```\n");
                }
            } else if (contextType == AiContextType.WORKFLOW) {
                WorkflowResponse workflow = workflowService.getById(contextId);
                ErrorSummaryResponse wfErrors = monitorService.getWorkflowErrorSummary(contextId, null, 0, 10);
                sb.append("### Active Workflow Context (`").append(workflow.getName()).append("`, ID: `").append(workflow.getId()).append("`)\n");
                sb.append("- **Status**: `").append(workflow.getStatus()).append("`\n");
                sb.append("- **Description**: ").append(workflow.getDescription() != null ? workflow.getDescription() : "(none)").append("\n");
                if (workflow.getValidationErrors() != null && !workflow.getValidationErrors().isEmpty()) {
                    sb.append("- **Topology / Validation Errors**: ").append(String.join("; ", workflow.getValidationErrors())).append("\n");
                }
                sb.append("- **Workflow DAG Nodes**:\n```json\n")
                        .append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(workflow.getNodes()))
                        .append("\n```\n");
                sb.append("- **Workflow Directed Edges**:\n```json\n")
                        .append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(workflow.getEdges()))
                        .append("\n```\n");
                if (wfErrors != null && wfErrors.getTotalErrors() > 0) {
                    sb.append("- **Recent Workflow Execution Errors (Total: ").append(wfErrors.getTotalErrors()).append(")**:\n```json\n")
                            .append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(wfErrors.getErrors()))
                            .append("\n```\n");
                }
            }
        } catch (Exception e) {
            log.warn("Could not enrich context for {} {}: {}", contextType, contextId, e.getMessage());
            sb.append("### Active Context Note\nCould not load context ").append(contextType).append(" `").append(contextId).append("`: ").append(e.getMessage()).append("\n");
        }
        return sb.toString();
    }
}
