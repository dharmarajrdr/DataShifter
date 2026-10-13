package com.datashifter.ai.advisors;

import com.datashifter.ai.spi.BeetelContextAdvisor;
import com.datashifter.common.dtos.ConnectionDtos.ConnectionResponse;
import com.datashifter.common.dtos.MonitorDtos.ErrorSummaryResponse;
import com.datashifter.common.dtos.PipelineDtos.PipelineResponse;
import com.datashifter.common.dtos.PipelineDtos.PipelineSummaryResponse;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowResponse;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowSummaryResponse;
import com.datashifter.common.enums.AiContextType;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.monitor.services.interfaces.MonitorService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class EntityContextAdvisor implements BeetelContextAdvisor {

    private final ConnectionService connectionService;
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
        StringBuilder sb = new StringBuilder();

        // 1. Always inject a compact live workspace inventory so the LLM does not burn tool round-trips just to list existing entities
        try {
            List<ConnectionResponse> conns = connectionService.getAll();
            List<PipelineSummaryResponse> pipes = pipelineService.getAll();
            List<WorkflowSummaryResponse> wfs = workflowService.getAll();

            sb.append("### Live Workspace Inventory\n");
            if (conns.isEmpty()) {
                sb.append("- **Connections**: (none configured)\n");
            } else {
                String connStr = conns.stream()
                        .map(c -> String.format("`%s` (id=`%s`, type=%s, db=%s, status=%s)",
                                c.getName(), c.getId(), c.getDbType(), c.getDatabaseName(), c.getStatus()))
                        .collect(Collectors.joining("; "));
                sb.append("- **Connections**: ").append(connStr).append("\n");
            }

            if (pipes.isEmpty()) {
                sb.append("- **Pipelines**: (none)\n");
            } else {
                String pipeStr = pipes.stream()
                        .map(p -> String.format("`%s` (id=`%s`, status=%s, src=`%s` -> tgt=`%s`)",
                                p.getName(), p.getId(), p.getStatus(), p.getSourceName(), p.getTargetName()))
                        .collect(Collectors.joining("; "));
                sb.append("- **Pipelines**: ").append(pipeStr).append("\n");
            }

            if (wfs.isEmpty()) {
                sb.append("- **Workflows**: (none)\n");
            } else {
                String wfStr = wfs.stream()
                        .map(w -> String.format("`%s` (id=`%s`, status=%s, pipelines=%d)",
                                w.getName(), w.getId(), w.getStatus(), w.getPipelineCount()))
                        .collect(Collectors.joining("; "));
                sb.append("- **Workflows**: ").append(wfStr).append("\n");
            }
        } catch (Exception e) {
            log.debug("Could not build workspace inventory summary: {}", e.getMessage());
        }

        if (contextType == null || contextType == AiContextType.NONE || contextId == null || contextId.isBlank()) {
            return sb.toString();
        }

        // 2. Inject active Pipeline or Workflow details in compact format
        try {
            if (contextType == AiContextType.PIPELINE) {
                PipelineResponse pipeline = pipelineService.getById(contextId);
                ErrorSummaryResponse errors = monitorService.getErrorSummary(contextId, 0, 5);
                sb.append("\n### Active Pipeline Context (`").append(pipeline.getName()).append("`, ID: `").append(pipeline.getId()).append("`)\n");
                sb.append("- Status: `").append(pipeline.getStatus()).append("`, SrcID: `").append(pipeline.getSourceConnectionId())
                        .append("`, TgtID: `").append(pipeline.getTargetConnectionId())
                        .append("`, WriteMode: `").append(pipeline.getDefaultWriteMode())
                        .append("`, ChunkSize: `").append(pipeline.getChunkSize()).append("`\n");
                if (pipeline.getValidationErrors() != null && !pipeline.getValidationErrors().isEmpty()) {
                    sb.append("- Validation Errors: ").append(String.join("; ", pipeline.getValidationErrors())).append("\n");
                }
                sb.append("- Tables & Mappings: `").append(objectMapper.writeValueAsString(pipeline.getTables())).append("`\n");
                if (errors != null && errors.getTotalErrors() > 0) {
                    sb.append("- Recent Errors (Total ").append(errors.getTotalErrors()).append("): `")
                            .append(objectMapper.writeValueAsString(errors.getErrors())).append("`\n");
                }
            } else if (contextType == AiContextType.WORKFLOW) {
                WorkflowResponse workflow = workflowService.getById(contextId);
                ErrorSummaryResponse wfErrors = monitorService.getWorkflowErrorSummary(contextId, null, 0, 5);
                sb.append("\n### Active Workflow Context (`").append(workflow.getName()).append("`, ID: `").append(workflow.getId()).append("`)\n");
                sb.append("- Status: `").append(workflow.getStatus()).append("`\n");
                if (workflow.getValidationErrors() != null && !workflow.getValidationErrors().isEmpty()) {
                    sb.append("- Validation Errors: ").append(String.join("; ", workflow.getValidationErrors())).append("\n");
                }
                sb.append("- Nodes: `").append(objectMapper.writeValueAsString(workflow.getNodes())).append("`\n");
                sb.append("- Edges: `").append(objectMapper.writeValueAsString(workflow.getEdges())).append("`\n");
                if (wfErrors != null && wfErrors.getTotalErrors() > 0) {
                    sb.append("- Recent Errors (Total ").append(wfErrors.getTotalErrors()).append("): `")
                            .append(objectMapper.writeValueAsString(wfErrors.getErrors())).append("`\n");
                }
            }
        } catch (Exception e) {
            log.warn("Could not enrich context for {} {}: {}", contextType, contextId, e.getMessage());
        }
        return sb.toString();
    }
}

