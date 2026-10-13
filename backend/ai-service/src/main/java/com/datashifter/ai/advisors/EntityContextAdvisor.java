package com.datashifter.ai.advisors;

import com.datashifter.ai.spi.BeetelContextAdvisor;
import com.datashifter.common.dtos.ConnectionDtos.ConnectionResponse;
import com.datashifter.common.dtos.MonitorDtos.ErrorSummaryResponse;
import com.datashifter.common.dtos.PipelineDtos.ColumnMappingResponse;
import com.datashifter.common.dtos.PipelineDtos.PipelineResponse;
import com.datashifter.common.dtos.PipelineDtos.PipelineSummaryResponse;
import com.datashifter.common.dtos.PipelineDtos.PipelineTableResponse;
import com.datashifter.common.dtos.PipelineDtos.TargetTableMappingResponse;
import com.datashifter.common.dtos.UdfDtos.UdfResponse;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowEdgeResponse;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowNodeResponse;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowResponse;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowSummaryResponse;
import com.datashifter.common.enums.AiContextType;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.monitor.services.interfaces.MonitorService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import com.datashifter.udf.services.UdfRegistryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class EntityContextAdvisor implements BeetelContextAdvisor {

    private final ConnectionService connectionService;
    private final PipelineService pipelineService;
    private final WorkflowService workflowService;
    private final MonitorService monitorService;
    private final UdfRegistryService udfRegistryService;
    private final ObjectMapper objectMapper;

    @Override
    public int getOrder() {
        return 10;
    }

    @Override
    public String buildContextSection(String userMessage, AiContextType contextType, String contextId) {
        StringBuilder sb = new StringBuilder();
        List<ConnectionResponse> conns = List.of();
        List<PipelineSummaryResponse> pipes = List.of();
        List<WorkflowSummaryResponse> wfs = List.of();
        List<UdfResponse> udfs = List.of();

        // 1. Always inject a compact live workspace inventory including Workflow DAG topology (nodes + edges) and UDFs
        try {
            conns = connectionService.getAll();
            pipes = pipelineService.getAll();
            wfs = workflowService.getAll();
            udfs = udfRegistryService.getAll();

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
                        .map(p -> String.format("`%s` (id=`%s`, status=%s, src=`%s` -> tgt=`%s`, tables=%d)",
                                p.getName(), p.getId(), p.getStatus(), p.getSourceName(), p.getTargetName(), p.getTableCount()))
                        .collect(Collectors.joining("; "));
                sb.append("- **Pipelines**: ").append(pipeStr).append("\n");
            }

            if (wfs.isEmpty()) {
                sb.append("- **Workflows**: (none)\n");
            } else {
                sb.append("- **Workflows & DAG Topology**:\n");
                for (WorkflowSummaryResponse w : wfs) {
                    try {
                        WorkflowResponse wfDetail = workflowService.getById(w.getId());
                        sb.append("  - **").append(w.getName()).append("** (id=`").append(w.getId())
                                .append("`, status=`").append(w.getStatus()).append("`): ")
                                .append(formatWorkflowDagSummary(wfDetail)).append("\n");
                    } catch (Exception ex) {
                        sb.append("  - **").append(w.getName()).append("** (id=`").append(w.getId())
                                .append("`, status=`").append(w.getStatus())
                                .append("`, pipelines=").append(w.getPipelineCount()).append(")\n");
                    }
                }
            }

            if (udfs.isEmpty()) {
                sb.append("- **UDFs**: (none registered)\n");
            } else {
                String udfStr = udfs.stream()
                        .map(u -> {
                            String funcs = u.getFunctions() != null
                                    ? u.getFunctions().stream().map(f -> f.getFunctionName()).collect(Collectors.joining(","))
                                    : "";
                            return String.format("`%s` (id=`%s`, artifact=`%s`, status=%s, usedInPipelines=%d, functions=[%s])",
                                    u.getName(), u.getId(), u.getArtifactName(), u.getStatus(),
                                    u.getPipelineCount() != null ? u.getPipelineCount() : 0L, funcs);
                        })
                        .collect(Collectors.joining("; "));
                sb.append("- **UDFs**: ").append(udfStr).append("\n");
            }
        } catch (Exception e) {
            log.debug("Could not build workspace inventory summary: {}", e.getMessage());
        }

        // Auto-resolve contextId if user selected a context type without choosing a specific item
        String resolvedId = (contextId != null && !contextId.isBlank()) ? contextId.trim() : null;
        AiContextType resolvedType = contextType != null ? contextType : AiContextType.NONE;

        if (resolvedId == null && userMessage != null && !userMessage.isBlank()) {
            String lowerMsg = userMessage.toLowerCase();
            if (resolvedType == AiContextType.WORKFLOW || lowerMsg.contains("workflow")) {
                for (WorkflowSummaryResponse w : wfs) {
                    if (w.getName() != null && lowerMsg.contains(w.getName().toLowerCase())) {
                        resolvedType = AiContextType.WORKFLOW;
                        resolvedId = w.getId();
                        break;
                    }
                }
                if (resolvedId == null && !wfs.isEmpty()) {
                    resolvedType = AiContextType.WORKFLOW;
                    resolvedId = wfs.get(0).getId();
                }
            } else if (resolvedType == AiContextType.PIPELINE) {
                for (PipelineSummaryResponse p : pipes) {
                    if (p.getName() != null && lowerMsg.contains(p.getName().toLowerCase())) {
                        resolvedId = p.getId();
                        break;
                    }
                }
                if (resolvedId == null && !pipes.isEmpty()) {
                    resolvedId = pipes.get(0).getId();
                }
            } else if (resolvedType == AiContextType.CONNECTION) {
                for (ConnectionResponse c : conns) {
                    if (c.getName() != null && lowerMsg.contains(c.getName().toLowerCase())) {
                        resolvedId = c.getId();
                        break;
                    }
                }
                if (resolvedId == null && !conns.isEmpty()) {
                    resolvedId = conns.get(0).getId();
                }
            } else if (resolvedType == AiContextType.UDF) {
                for (UdfResponse u : udfs) {
                    if (u.getName() != null && lowerMsg.contains(u.getName().toLowerCase())) {
                        resolvedId = u.getId();
                        break;
                    }
                }
                if (resolvedId == null && !udfs.isEmpty()) {
                    resolvedId = udfs.get(0).getId();
                }
            }
        }

        if (resolvedType == AiContextType.NONE || resolvedId == null) {
            return sb.toString();
        }

        // 2. Inject active Pipeline, Workflow, Connection, or UDF details in compact format
        try {
            if (resolvedType == AiContextType.PIPELINE) {
                PipelineResponse pipeline = pipelineService.getById(resolvedId);
                ErrorSummaryResponse errors = monitorService.getErrorSummary(resolvedId, 0, 5);
                sb.append("\n### Active Pipeline Context (`").append(pipeline.getName()).append("`, ID: `").append(pipeline.getId()).append("`)\n");
                sb.append("- Status: `").append(pipeline.getStatus()).append("`, SrcID: `").append(pipeline.getSourceConnectionId())
                        .append("`, TgtID: `").append(pipeline.getTargetConnectionId())
                        .append("`, WriteMode: `").append(pipeline.getDefaultWriteMode())
                        .append("`, ChunkSize: `").append(pipeline.getChunkSize()).append("`\n");
                if (pipeline.getValidationErrors() != null && !pipeline.getValidationErrors().isEmpty()) {
                    sb.append("- Validation Errors: ").append(String.join("; ", pipeline.getValidationErrors())).append("\n");
                }
                sb.append("- Tables & Mappings: ").append(formatPipelineTablesSummary(pipeline)).append("\n");
                if (errors != null && errors.getTotalErrors() > 0) {
                    sb.append("- Recent Errors (Total ").append(errors.getTotalErrors()).append("): `")
                            .append(objectMapper.writeValueAsString(errors.getErrors())).append("`\n");
                }
            } else if (resolvedType == AiContextType.WORKFLOW) {
                WorkflowResponse workflow = workflowService.getById(resolvedId);
                ErrorSummaryResponse wfErrors = monitorService.getWorkflowErrorSummary(resolvedId, null, 0, 5);
                sb.append("\n### Active Workflow Context (`").append(workflow.getName()).append("`, ID: `").append(workflow.getId()).append("`)\n");
                sb.append("- Status: `").append(workflow.getStatus()).append("`\n");
                sb.append("- DAG Analysis: ").append(formatWorkflowDagSummary(workflow)).append("\n");
                if (workflow.getValidationErrors() != null && !workflow.getValidationErrors().isEmpty()) {
                    sb.append("- Validation Errors: ").append(String.join("; ", workflow.getValidationErrors())).append("\n");
                }
                if (wfErrors != null && wfErrors.getTotalErrors() > 0) {
                    sb.append("- Recent Errors (Total ").append(wfErrors.getTotalErrors()).append("): `")
                            .append(objectMapper.writeValueAsString(wfErrors.getErrors())).append("`\n");
                }
            } else if (resolvedType == AiContextType.CONNECTION) {
                final String targetConnId = resolvedId;
                ConnectionResponse conn = connectionService.getById(targetConnId);
                sb.append("\n### Active Connection Context (`").append(conn.getName()).append("`, ID: `").append(conn.getId()).append("`)\n");
                sb.append("- Database Type: `").append(conn.getDbType()).append("`, Status: `").append(conn.getStatus())
                        .append("`, Database/Instance: `").append(conn.getDatabaseName())
                        .append("`, Host: `").append(conn.getHost() != null ? conn.getHost() : "N/A")
                        .append("`, Port: `").append(conn.getPort() != null ? conn.getPort() : "N/A").append("`\n");
                List<String> linkedPipes = pipes.stream()
                        .filter(p -> targetConnId.equals(p.getSourceConnectionId()) || targetConnId.equals(p.getTargetConnectionId())
                                || (conn.getName() != null && (conn.getName().equals(p.getSourceName()) || conn.getName().equals(p.getTargetName()))))
                        .map(p -> String.format("`%s` (id=`%s`, status=%s)", p.getName(), p.getId(), p.getStatus()))
                        .toList();
                sb.append("- Used By Pipelines: ").append(linkedPipes.isEmpty() ? "(none)" : String.join(", ", linkedPipes)).append("\n");
            } else if (resolvedType == AiContextType.UDF) {
                String targetUdfId = resolvedId;
                UdfResponse udf = udfs.stream()
                        .filter(u -> targetUdfId.equals(u.getId()))
                        .findFirst()
                        .orElse(null);
                if (udf != null) {
                    sb.append("\n### Active UDF Context (`").append(udf.getName()).append("`, ID: `").append(udf.getId()).append("`)\n");
                    sb.append("- Artifact: `").append(udf.getArtifactName()).append("`, Version: `").append(udf.getVersion())
                            .append("`, Status: `").append(udf.getStatus())
                            .append("`, Referenced By Pipelines: `").append(udf.getPipelineCount() != null ? udf.getPipelineCount() : 0L).append("`\n");
                    if (udf.getDescription() != null && !udf.getDescription().isBlank()) {
                        sb.append("- Description: ").append(udf.getDescription()).append("\n");
                    }
                    if (udf.getFunctions() != null && !udf.getFunctions().isEmpty()) {
                        String fnDetails = udf.getFunctions().stream()
                                .map(f -> String.format("`%s` (class=`%s`, returnType=`%s`, desc=`%s`)",
                                        f.getFunctionName(), f.getClassName(), f.getReturnType(), f.getDescription()))
                                .collect(Collectors.joining("; "));
                        sb.append("- Functions: ").append(fnDetails).append("\n");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not enrich context for {} {}: {}", resolvedType, resolvedId, e.getMessage());
        }
        return sb.toString();
    }

    private String formatWorkflowDagSummary(WorkflowResponse wf) {
        List<WorkflowNodeResponse> nodes = wf.getNodes() != null ? wf.getNodes() : List.of();
        List<WorkflowEdgeResponse> edges = wf.getEdges() != null ? wf.getEdges() : List.of();

        if (nodes.isEmpty()) {
            return "Nodes: (none), Edges: (none)";
        }

        Map<String, String> idToName = new LinkedHashMap<>();
        Map<String, Integer> inDegree = new LinkedHashMap<>();
        Map<String, List<String>> outgoing = new LinkedHashMap<>();

        for (WorkflowNodeResponse n : nodes) {
            String pId = n.getPipelineId();
            String pName = n.getPipelineName() != null ? n.getPipelineName() : pId;
            idToName.put(pId, pName);
            inDegree.put(pId, 0);
            outgoing.put(pId, new ArrayList<>());
        }

        List<String> edgeDescriptions = new ArrayList<>();
        for (WorkflowEdgeResponse e : edges) {
            String srcId = e.getSourcePipelineId();
            String tgtId = e.getTargetPipelineId();
            String srcName = idToName.getOrDefault(srcId, srcId);
            String tgtName = idToName.getOrDefault(tgtId, tgtId);
            edgeDescriptions.add(String.format("`%s` -> `%s` (onFailure=%s)",
                    srcName, tgtName, e.getOnFailureAction() != null ? e.getOnFailureAction() : "STOP_WORKFLOW"));
            inDegree.put(tgtId, inDegree.getOrDefault(tgtId, 0) + 1);
            outgoing.computeIfAbsent(srcId, k -> new ArrayList<>()).add(tgtName);
        }

        List<String> nodeDescriptions = nodes.stream()
                .map(n -> String.format("`%s` (pipelineId=`%s`, status=%s)",
                        n.getPipelineName(), n.getPipelineId(), n.getPipelineStatus()))
                .toList();

        List<String> rootNodes = inDegree.entrySet().stream()
                .filter(entry -> entry.getValue() == 0)
                .map(entry -> "`" + idToName.getOrDefault(entry.getKey(), entry.getKey()) + "`")
                .toList();

        List<String> fanOutParallel = outgoing.entrySet().stream()
                .filter(entry -> entry.getValue().size() > 1)
                .map(entry -> "after `" + idToName.getOrDefault(entry.getKey(), entry.getKey()) + "` -> ["
                        + entry.getValue().stream().map(t -> "`" + t + "`").collect(Collectors.joining(", "))
                        + "] run in parallel")
                .toList();

        StringBuilder dag = new StringBuilder();
        dag.append("Nodes(").append(nodes.size()).append(")=[").append(String.join(", ", nodeDescriptions)).append("]; ");
        if (edges.isEmpty()) {
            dag.append("Edges=(none — all ").append(nodes.size()).append(" nodes are independent root nodes and can run in parallel)");
        } else {
            dag.append("Edges(").append(edges.size()).append(")=[").append(String.join(", ", edgeDescriptions)).append("]; ");
            dag.append("Entry/Root Nodes=[").append(String.join(", ", rootNodes)).append("]");
            if (rootNodes.size() > 1) {
                dag.append(" (multiple root nodes start in parallel)");
            }
            if (!fanOutParallel.isEmpty()) {
                dag.append("; Fan-out Parallel Branches=[").append(String.join("; ", fanOutParallel)).append("]");
            } else if (rootNodes.size() <= 1) {
                dag.append("; Execution Mode=Strictly Sequential (single linear chain, no parallel branches)");
            }
        }
        return dag.toString();
    }

    private String formatPipelineTablesSummary(PipelineResponse pipeline) {
        if (pipeline.getTables() == null || pipeline.getTables().isEmpty()) {
            return "(no tables configured)";
        }
        List<String> tableEntries = new ArrayList<>();
        for (PipelineTableResponse pt : pipeline.getTables()) {
            List<TargetTableMappingResponse> targets = pt.getTargetMappings() != null ? pt.getTargetMappings() : List.of();
            if (targets.isEmpty()) {
                tableEntries.add(String.format("`%s` (pipelineTableId=`%s`, unmapped)", pt.getSourceTable(), pt.getId()));
                continue;
            }
            for (TargetTableMappingResponse tm : targets) {
                List<ColumnMappingResponse> cols = tm.getColumnMappings() != null ? tm.getColumnMappings() : List.of();
                String colSummary = cols.stream()
                        .limit(15)
                        .map(cm -> {
                            String base = (cm.getSourceColumn() != null ? cm.getSourceColumn() : "DEFAULT") + "->" + cm.getTargetColumn();
                            if (cm.getTransformations() != null && !cm.getTransformations().isEmpty()) {
                                String fns = cm.getTransformations().stream()
                                        .map(t -> String.valueOf(t.getFunctionName()))
                                        .collect(Collectors.joining("+"));
                                return base + "(" + fns + ")";
                            }
                            return base;
                        })
                        .collect(Collectors.joining(", "));
                if (cols.size() > 15) {
                    colSummary += ", ... (+" + (cols.size() - 15) + " more)";
                }
                tableEntries.add(String.format("`%s` -> `%s` (pipelineTableId=`%s`, writeMode=%s, cols(%d)=[%s])",
                        pt.getSourceTable(), tm.getTargetTable(), pt.getId(), tm.getWriteMode(), cols.size(), colSummary));
            }
        }
        return String.join("; ", tableEntries);
    }
}
