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

    @Tool(description = "List all database connections configured in the current organization with their ID, name, dbType, host, port, databaseName, schemaName, status, and tableCount.")
    public List<ConnectionResponse> listConnections() {
        return connectionService.getAll();
    }

    @Tool(description = "Get detailed information for a specific database connection by connection ID.")
    public ConnectionResponse getConnectionById(
            @ToolParam(description = "The unique ID of the database connection") String connectionId) {
        return connectionService.getById(connectionId);
    }

    @Tool(description = "Test connectivity to a database connection by connection ID and return latency and table count.")
    public TestConnectionResponse testDatabaseConnection(
            @ToolParam(description = "The unique ID of the database connection to test") String connectionId) {
        return connectionService.testConnection(connectionId);
    }

    @Tool(description = "List all table names in a database connection by connection ID.")
    public List<String> listDatabaseTables(
            @ToolParam(description = "The unique ID of the database connection") String connectionId) {
        return connectionService.listTables(connectionId);
    }

    @Tool(description = "Get column schema metadata (column names, data types, nullable, primary key, row count) for a specific table in a database connection.")
    public TableMetadata getTableSchema(
            @ToolParam(description = "The unique ID of the database connection") String connectionId,
            @ToolParam(description = "The exact table name") String tableName) {
        return connectionService.getTableMetadata(connectionId, tableName);
    }

    @Tool(description = "Get foreign key relationships for a specific table in a database connection.")
    public List<ForeignKeyMetadata> getTableForeignKeys(
            @ToolParam(description = "The unique ID of the database connection") String connectionId,
            @ToolParam(description = "The exact table name") String tableName) {
        return connectionService.getForeignKeys(connectionId, tableName);
    }

    @Tool(description = "Compute topologically sorted migration order for a list of tables in a database connection based on foreign key dependencies.")
    public SmartOrderResponse computeSmartTableOrder(
            @ToolParam(description = "The unique ID of the database connection") String connectionId,
            @ToolParam(description = "List of table names to sort") List<String> tableNames) {
        return tableOrderService.smartOrder(SmartOrderRequest.builder()
                .connectionId(connectionId)
                .tableNames(tableNames)
                .build());
    }

    @Tool(description = "List all pipelines in the current organization with their ID, name, status, sourceConnectionId, targetConnectionId, progress, and validationErrors.")
    public List<PipelineSummaryResponse> listPipelines() {
        return pipelineService.getAll();
    }

    @Tool(description = "Get full configuration of a pipeline by ID, including table mappings, column mappings, transformations, filters, settings, and validation errors.")
    public PipelineResponse getPipelineDetails(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId) {
        return pipelineService.getById(pipelineId);
    }

    @Tool(description = "Get live source/target column schemas, column mappings, transformations, filters, and validation errors for a pipeline by ID.")
    public MappingResponse getPipelineColumnMappings(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId) {
        return mappingService.getMappings(pipelineId);
    }

    @Tool(description = "List all workflows in the current organization with their ID, name, status, and pipeline count.")
    public List<WorkflowSummaryResponse> listWorkflows() {
        return workflowService.getAll();
    }

    @Tool(description = "Get full details of a workflow by ID, including its DAG nodes, directed edges, and validation errors.")
    public WorkflowResponse getWorkflowDetails(
            @ToolParam(description = "The unique ID of the workflow") String workflowId) {
        return workflowService.getById(workflowId);
    }

    @Tool(description = "List validated pipelines eligible to be added to a workflow.")
    public List<PipelineSummaryResponse> listEligiblePipelinesForWorkflow(
            @ToolParam(description = "Optional workflow ID") String workflowId) {
        return workflowService.getEligiblePipelines(workflowId);
    }

    @Tool(description = "List all namespaces in the current organization.")
    public List<NamespaceResponse> listNamespaces() {
        return namespaceService.getAll();
    }

    @Tool(description = "List all registered User-Defined Functions (UDFs) and their Java methods available for column transformations.")
    public List<UdfResponse> listUdfs() {
        return udfRegistryService.getAll();
    }

    @Tool(description = "Get live monitoring metrics (rowsProcessed, rowsPerSec, errorsSkipped, overallProgress, validationErrors) for a pipeline.")
    public LiveMonitorResponse getPipelineLiveMonitor(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId) {
        return monitorService.getLiveMonitor(pipelineId);
    }

    @Tool(description = "Get error summary and detailed row/chunk failure logs for debugging a pipeline.")
    public ErrorSummaryResponse getPipelineErrorLogs(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId,
            @ToolParam(description = "Page number (0-indexed)") int page,
            @ToolParam(description = "Number of errors to fetch (e.g. 20)") int size) {
        return monitorService.getErrorSummary(pipelineId, Math.max(0, page), Math.min(50, Math.max(1, size)));
    }

    @Tool(description = "Get error summary and detailed error logs across a workflow for debugging failed workflow stages.")
    public ErrorSummaryResponse getWorkflowErrorLogs(
            @ToolParam(description = "The unique ID of the workflow") String workflowId,
            @ToolParam(description = "Optional pipeline ID filter within the workflow") String pipelineIdFilter,
            @ToolParam(description = "Page number (0-indexed)") int page,
            @ToolParam(description = "Number of errors to fetch (e.g. 20)") int size) {
        return monitorService.getWorkflowErrorSummary(workflowId, pipelineIdFilter, Math.max(0, page), Math.min(50, Math.max(1, size)));
    }

    @Tool(description = "Get historical execution runs for a pipeline.")
    public List<ExecutionLogResponse> getPipelineExecutionHistory(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId) {
        return monitorService.getExecutionHistory(pipelineId);
    }
}
