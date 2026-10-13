package com.datashifter.ai.tools;

import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.dtos.MappingDtos.MappingResponse;
import com.datashifter.common.dtos.MonitorDtos.*;
import com.datashifter.common.dtos.NamespaceDtos.NamespaceResponse;
import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.dtos.TableOrderDtos.*;
import com.datashifter.common.dtos.UdfDtos.UdfResponse;
import com.datashifter.common.dtos.WorkflowDtos.*;
import com.datashifter.connector.services.implementations.TableOrderService;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.monitor.services.interfaces.MonitorService;
import com.datashifter.pipeline.services.implementations.MappingService;
import com.datashifter.pipeline.services.implementations.NamespaceService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import com.datashifter.udf.services.UdfRegistryService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Exposes safe, read-only discovery, schema introspection, and error debugging @Tool methods
 * to Beetel during the conversational analysis and planning phase.
 *
 * Mutating @Tool methods on ConnectionService, PipelineService, WorkflowService, etc. are
 * executed only after the user explicitly confirms an Execution Plan.
 */
@Component
@RequiredArgsConstructor
public class BeetelReadOnlyToolFacade {

    private final ConnectionService connectionService;
    private final TableOrderService tableOrderService;
    private final PipelineService pipelineService;
    private final MappingService mappingService;
    private final NamespaceService namespaceService;
    private final WorkflowService workflowService;
    private final MonitorService monitorService;
    private final UdfRegistryService udfRegistryService;

    @Tool(description = "List all table names in a database connection by connectionId.")
    public List<String> listDatabaseTables(
            @ToolParam(description = "Database connection ID") String connectionId) {
        return connectionService.listTables(connectionId);
    }

    @Tool(description = "Get column schema metadata (columns, types, PKs) for a table in a database connection.")
    public TableMetadata getTableSchema(
            @ToolParam(description = "Database connection ID") String connectionId,
            @ToolParam(description = "Table name") String tableName) {
        return connectionService.getTableMetadata(connectionId, tableName);
    }

    @Tool(description = "Compute topologically sorted migration order for tables based on foreign keys.")
    public SmartOrderResponse computeSmartTableOrder(
            @ToolParam(description = "Database connection ID") String connectionId,
            @ToolParam(description = "Table names to sort") List<String> tableNames) {
        return tableOrderService.smartOrder(SmartOrderRequest.builder()
                .connectionId(connectionId)
                .tableNames(tableNames)
                .build());
    }

    @Tool(description = "Get full configuration of a pipeline by pipelineId (tables, column mappings, transformations, filters, settings).")
    public PipelineResponse getPipelineDetails(
            @ToolParam(description = "Pipeline ID") String pipelineId) {
        return pipelineService.getById(pipelineId);
    }

    @Tool(description = "List registered Java UDFs and methods available for column transformations.")
    public List<UdfResponse> listUdfs() {
        return udfRegistryService.getAll();
    }

    @Tool(description = "Get error summary and failed row logs for debugging a pipeline.")
    public ErrorSummaryResponse getPipelineErrorLogs(
            @ToolParam(description = "Pipeline ID") String pipelineId,
            @ToolParam(description = "Page (0-indexed)") int page,
            @ToolParam(description = "Page size (max 20)") int size) {
        return monitorService.getErrorSummary(pipelineId, Math.max(0, page), Math.min(20, Math.max(1, size)));
    }

    @Tool(description = "Get error summary and failed stage logs across a workflow.")
    public ErrorSummaryResponse getWorkflowErrorLogs(
            @ToolParam(description = "Workflow ID") String workflowId,
            @ToolParam(description = "Optional pipelineId filter") String pipelineIdFilter,
            @ToolParam(description = "Page (0-indexed)") int page,
            @ToolParam(description = "Page size (max 20)") int size) {
        return monitorService.getWorkflowErrorSummary(workflowId, pipelineIdFilter, Math.max(0, page), Math.min(20, Math.max(1, size)));
    }
}
