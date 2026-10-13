package com.datashifter.ai.tools;

import com.datashifter.ai.services.AgentPermissionService;
import com.datashifter.common.dtos.ConnectionDtos.ConnectionResponse;
import com.datashifter.common.dtos.ConnectionDtos.CreateConnectionRequest;
import com.datashifter.common.dtos.ConnectionDtos.TestConnectionResponse;
import com.datashifter.common.dtos.ConnectionDtos.UpdateConnectionRequest;
import com.datashifter.common.dtos.NamespaceDtos.CreateNamespaceRequest;
import com.datashifter.common.dtos.NamespaceDtos.NamespaceResponse;
import com.datashifter.common.dtos.PipelineDtos.AddTablePairRequest;
import com.datashifter.common.dtos.PipelineDtos.PipelineActionRequest;
import com.datashifter.common.dtos.PipelineDtos.PipelineResponse;
import com.datashifter.common.dtos.PipelineDtos.UpdatePipelineRequest;
import com.datashifter.common.dtos.WorkflowDtos.AddWorkflowPipelinesRequest;
import com.datashifter.common.dtos.WorkflowDtos.CreateWorkflowRequest;
import com.datashifter.common.dtos.WorkflowDtos.SaveWorkflowCanvasRequest;
import com.datashifter.common.dtos.WorkflowDtos.UpdateWorkflowRequest;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowActionRequest;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowResponse;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.dtos.PipelineDtos.PipelineAction;
import com.datashifter.common.dtos.WorkflowDtos.WorkflowAction;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.monitor.services.interfaces.MonitorService;
import com.datashifter.pipeline.services.implementations.NamespaceService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import com.datashifter.udf.services.UdfRegistryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Exposes explicit mutating action tools to Beetel during conversational turns.
 * Each tool method is explicitly named with clean scalar parameters and enforces
 * strict organization and Agent role permissions via AgentPermissionService.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BeetelActionToolFacade {

    private final ConnectionService connectionService;
    private final PipelineService pipelineService;
    private final WorkflowService workflowService;
    private final NamespaceService namespaceService;
    private final MonitorService monitorService;
    private final UdfRegistryService udfRegistryService;
    private final AgentPermissionService agentPermissionService;

    // =========================================================================
    // WORKFLOW ACTIONS
    // =========================================================================

    @Tool(name = "updateWorkflow", description = "Update an existing workflow's name, description, or namespace.")
    public WorkflowResponse updateWorkflow(
            @ToolParam(description = "The unique ID of the workflow to update") String workflowId,
            @ToolParam(description = "New name for the workflow (optional)") String name,
            @ToolParam(description = "New description for the workflow (optional)") String description,
            @ToolParam(description = "Namespace ID to assign the workflow to (optional)") String namespaceId) {
        agentPermissionService.assertPermission(Permissions.WORKFLOW_EDIT);
        UpdateWorkflowRequest req = UpdateWorkflowRequest.builder()
                .name(name)
                .description(description)
                .namespaceId(namespaceId)
                .build();
        return workflowService.update(workflowId, req);
    }

    @Tool(name = "createWorkflow", description = "Create a new workflow with a name and optional description and namespace.")
    public WorkflowResponse createWorkflow(
            @ToolParam(description = "Name of the new workflow") String name,
            @ToolParam(description = "Description of the workflow (optional)") String description,
            @ToolParam(description = "Namespace ID (optional)") String namespaceId) {
        agentPermissionService.assertPermission(Permissions.WORKFLOW_CREATE);
        CreateWorkflowRequest req = CreateWorkflowRequest.builder()
                .name(name)
                .description(description)
                .namespaceId(namespaceId)
                .build();
        return workflowService.create(req);
    }

    @Tool(name = "deleteWorkflow", description = "Delete an existing workflow by its ID.")
    public String deleteWorkflow(
            @ToolParam(description = "The unique ID of the workflow to delete") String workflowId) {
        agentPermissionService.assertPermission(Permissions.WORKFLOW_DELETE);
        workflowService.delete(workflowId);
        return "Workflow " + workflowId + " successfully deleted.";
    }

    @Tool(name = "runWorkflow", description = "Execute a lifecycle action on a workflow (START, PAUSE, RESUME, STOP, RERUN_FAILED_STAGE, RERUN_FROM_CHECKPOINT).")
    public WorkflowResponse runWorkflow(
            @ToolParam(description = "The unique ID of the workflow") String workflowId,
            @ToolParam(description = "Action to execute: START, PAUSE, RESUME, STOP, RERUN_FAILED_STAGE, RERUN_FROM_CHECKPOINT") String action) {
        String act = action != null ? action.trim().toUpperCase() : "START";
        if ("PAUSE".equals(act)) {
            agentPermissionService.assertPermission(Permissions.WORKFLOW_PAUSE);
        } else if ("STOP".equals(act)) {
            agentPermissionService.assertPermission(Permissions.WORKFLOW_STOP);
        } else {
            agentPermissionService.assertPermission(Permissions.WORKFLOW_RUN);
        }
        WorkflowActionRequest req = WorkflowActionRequest.builder()
                .action(WorkflowAction.valueOf(act))
                .build();
        return workflowService.performAction(workflowId, req);
    }

    @Tool(name = "addWorkflowPipelines", description = "Add one or more pipeline IDs as nodes to an existing workflow.")
    public WorkflowResponse addWorkflowPipelines(
            @ToolParam(description = "The unique ID of the workflow") String workflowId,
            @ToolParam(description = "List of pipeline IDs to add to the workflow") List<String> pipelineIds) {
        agentPermissionService.assertPermission(Permissions.WORKFLOW_EDIT);
        AddWorkflowPipelinesRequest req = AddWorkflowPipelinesRequest.builder()
                .pipelineIds(pipelineIds)
                .build();
        return workflowService.addPipelines(workflowId, req);
    }

    @Tool(name = "removeWorkflowPipeline", description = "Remove a pipeline node and its connected edges from a workflow.")
    public WorkflowResponse removeWorkflowPipeline(
            @ToolParam(description = "The unique ID of the workflow") String workflowId,
            @ToolParam(description = "The unique ID of the pipeline to remove") String pipelineId) {
        agentPermissionService.assertPermission(Permissions.WORKFLOW_EDIT);
        return workflowService.removePipeline(workflowId, pipelineId);
    }

    // =========================================================================
    // PIPELINE ACTIONS
    // =========================================================================

    @Tool(name = "updatePipeline", description = "Update an existing pipeline's name, description, or settings.")
    public PipelineResponse updatePipeline(
            @ToolParam(description = "The unique ID of the pipeline to update") String pipelineId,
            @ToolParam(description = "New name for the pipeline (optional)") String name,
            @ToolParam(description = "New description for the pipeline (optional)") String description,
            @ToolParam(description = "Chunk batch size (optional)") Integer chunkSize) {
        agentPermissionService.assertPermission(Permissions.PIPELINE_EDIT);
        UpdatePipelineRequest req = UpdatePipelineRequest.builder()
                .name(name)
                .description(description)
                .chunkSize(chunkSize)
                .build();
        return pipelineService.update(pipelineId, req);
    }

    @Tool(name = "deletePipeline", description = "Delete an existing pipeline by its ID.")
    public String deletePipeline(
            @ToolParam(description = "The unique ID of the pipeline to delete") String pipelineId) {
        agentPermissionService.assertPermission(Permissions.PIPELINE_DELETE);
        pipelineService.delete(pipelineId);
        return "Pipeline " + pipelineId + " successfully deleted.";
    }

    @Tool(name = "runPipeline", description = "Execute a lifecycle action on a pipeline (START, PAUSE, RESUME, STOP).")
    public PipelineResponse runPipeline(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId,
            @ToolParam(description = "Action to execute: START, PAUSE, RESUME, STOP") String action) {
        String act = action != null ? action.trim().toUpperCase() : "START";
        if ("PAUSE".equals(act)) {
            agentPermissionService.assertPermission(Permissions.PIPELINE_PAUSE);
        } else if ("STOP".equals(act)) {
            agentPermissionService.assertPermission(Permissions.PIPELINE_STOP);
        } else {
            agentPermissionService.assertPermission(Permissions.PIPELINE_RUN);
        }
        PipelineActionRequest req = new PipelineActionRequest();
        req.setAction(PipelineAction.valueOf(act));
        return pipelineService.performAction(pipelineId, req);
    }

    @Tool(name = "addTablePair", description = "Add a source and target table pair to an existing pipeline.")
    public PipelineResponse addTablePair(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId,
            @ToolParam(description = "Name of source table") String sourceTable,
            @ToolParam(description = "Name of target table") String targetTable) {
        agentPermissionService.assertPermission(Permissions.PIPELINE_EDIT);
        AddTablePairRequest req = AddTablePairRequest.builder()
                .sourceTable(sourceTable)
                .targetTable(targetTable)
                .build();
        return pipelineService.addTablePair(pipelineId, req);
    }

    @Tool(name = "removeTablePair", description = "Remove a table pair mapping from an existing pipeline.")
    public PipelineResponse removeTablePair(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId,
            @ToolParam(description = "Pipeline table mapping ID to remove") String pipelineTableId) {
        agentPermissionService.assertPermission(Permissions.PIPELINE_EDIT);
        return pipelineService.removeTablePair(pipelineId, pipelineTableId);
    }

    // =========================================================================
    // CONNECTION ACTIONS
    // =========================================================================

    @Tool(name = "createConnection", description = "Create a new database connection.")
    public ConnectionResponse createConnection(
            @ToolParam(description = "Display name for the connection") String name,
            @ToolParam(description = "Database type: POSTGRESQL, MYSQL, ORACLE, SQL_SERVER, SPANNER") String dbType,
            @ToolParam(description = "Hostname or IP address") String host,
            @ToolParam(description = "Port number (optional)") Integer port,
            @ToolParam(description = "Database name") String databaseName,
            @ToolParam(description = "Schema name (optional)") String schemaName,
            @ToolParam(description = "Username") String username,
            @ToolParam(description = "Password") String password) {
        agentPermissionService.assertPermission(Permissions.CONNECTION_CREATE);
        CreateConnectionRequest req = CreateConnectionRequest.builder()
                .name(name)
                .dbType(DatabaseType.valueOf(dbType.trim().toUpperCase()))
                .host(host)
                .port(port)
                .databaseName(databaseName)
                .schemaName(schemaName)
                .username(username)
                .password(password)
                .build();
        return connectionService.create(req);
    }

    @Tool(name = "updateConnection", description = "Update an existing database connection details.")
    public ConnectionResponse updateConnection(
            @ToolParam(description = "Connection ID to update") String connectionId,
            @ToolParam(description = "Updated name (optional)") String name,
            @ToolParam(description = "Updated host (optional)") String host,
            @ToolParam(description = "Updated port (optional)") Integer port,
            @ToolParam(description = "Updated database name (optional)") String databaseName,
            @ToolParam(description = "Updated schema name (optional)") String schemaName,
            @ToolParam(description = "Updated username (optional)") String username,
            @ToolParam(description = "Updated password (optional)") String password) {
        agentPermissionService.assertPermission(Permissions.CONNECTION_EDIT);
        UpdateConnectionRequest req = UpdateConnectionRequest.builder()
                .name(name)
                .host(host)
                .port(port)
                .databaseName(databaseName)
                .schemaName(schemaName)
                .username(username)
                .password(password)
                .build();
        return connectionService.update(connectionId, req);
    }

    @Tool(name = "deleteConnection", description = "Delete a database connection by ID.")
    public String deleteConnection(
            @ToolParam(description = "Connection ID to delete") String connectionId) {
        agentPermissionService.assertPermission(Permissions.CONNECTION_DELETE);
        connectionService.delete(connectionId);
        return "Connection " + connectionId + " successfully deleted.";
    }

    @Tool(name = "testConnection", description = "Test connectivity for a database connection by ID.")
    public TestConnectionResponse testConnection(
            @ToolParam(description = "Connection ID to test") String connectionId) {
        agentPermissionService.assertPermission(Permissions.CONNECTION_TEST);
        return connectionService.testConnection(connectionId);
    }

    // =========================================================================
    // NAMESPACE ACTIONS
    // =========================================================================

    @Tool(name = "createNamespace", description = "Create a new namespace for organizing pipelines and workflows.")
    public NamespaceResponse createNamespace(
            @ToolParam(description = "Namespace name") String name,
            @ToolParam(description = "Namespace description (optional)") String description,
            @ToolParam(description = "Hex color code e.g. #534AB7 (optional)") String color) {
        agentPermissionService.assertPermission(Permissions.NAMESPACE_CREATE);
        CreateNamespaceRequest req = CreateNamespaceRequest.builder()
                .name(name)
                .description(description)
                .color(color)
                .build();
        return namespaceService.create(req);
    }

    @Tool(name = "deleteNamespace", description = "Delete a namespace by ID and move contained items to default.")
    public String deleteNamespace(
            @ToolParam(description = "Namespace ID to delete") String namespaceId) {
        agentPermissionService.assertPermission(Permissions.NAMESPACE_DELETE);
        namespaceService.delete(namespaceId);
        return "Namespace " + namespaceId + " successfully deleted.";
    }

    // =========================================================================
    // UDF & MONITOR ACTIONS
    // =========================================================================

    @Tool(name = "deleteUdf", description = "Delete a registered Java UDF by ID.")
    public String deleteUdf(
            @ToolParam(description = "UDF ID to delete") String udfId) {
        agentPermissionService.assertPermission(Permissions.UDF_DELETE);
        udfRegistryService.delete(udfId);
        return "UDF " + udfId + " successfully deleted.";
    }

    @Tool(name = "clearPipelineErrors", description = "Clear recorded error logs and reset error counters for a pipeline.")
    public String clearPipelineErrors(
            @ToolParam(description = "Pipeline ID to clear errors for") String pipelineId) {
        agentPermissionService.assertPermission(Permissions.MONITOR_VIEW_ERRORS);
        monitorService.clearErrors(pipelineId);
        return "Error logs for pipeline " + pipelineId + " successfully cleared.";
    }

    @Tool(name = "clearWorkflowErrors", description = "Clear recorded error logs across all pipelines in a workflow.")
    public String clearWorkflowErrors(
            @ToolParam(description = "Workflow ID to clear errors for") String workflowId) {
        agentPermissionService.assertPermission(Permissions.MONITOR_VIEW_ERRORS);
        monitorService.clearWorkflowErrors(workflowId);
        return "Error logs for workflow " + workflowId + " successfully cleared.";
    }
}
