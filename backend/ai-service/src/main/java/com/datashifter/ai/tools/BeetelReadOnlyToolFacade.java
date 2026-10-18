package com.datashifter.ai.tools;

import com.datashifter.ai.services.AgentPermissionService;
import com.datashifter.common.dtos.AdapterDtos.AdapterResponse;
import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.dtos.MonitorDtos.ErrorSummaryResponse;
import com.datashifter.common.dtos.PipelineDtos.PipelineResponse;
import com.datashifter.common.dtos.TableOrderDtos.*;
import com.datashifter.common.dtos.UdfDtos.UdfResponse;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.datashifter.common.repositories.OrgPurchasedAdapterRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.connector.services.implementations.TableOrderService;
import com.datashifter.connector.services.interfaces.ConnectionService;
import com.datashifter.monitor.services.interfaces.MonitorService;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.udf.services.UdfRegistryService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class BeetelReadOnlyToolFacade {

    private final ConnectionService connectionService;
    private final TableOrderService tableOrderService;
    private final PipelineService pipelineService;
    private final MonitorService monitorService;
    private final UdfRegistryService udfRegistryService;
    private final AdapterDefinitionRepository adapterRepo;
    private final OrgPurchasedAdapterRepository purchasedRepo;
    private final AgentPermissionService agentPermissionService;

    @Tool(description = "List all table names in a database connection by connectionId.")
    public List<String> listDatabaseTables(@ToolParam(description = "Database connection ID") String connectionId) {
        agentPermissionService.assertPermission(Permissions.CONNECTION_VIEW);
        agentPermissionService.assertPermission(Permissions.CONNECTION_BROWSE_SCHEMA);
        return connectionService.listTables(connectionId);
    }

    @Tool(description = "Get column schema metadata for a table in a database connection.")
    public TableMetadata getTableSchema(@ToolParam(description = "Database connection ID") String connectionId,
                                        @ToolParam(description = "Table name") String tableName) {
        agentPermissionService.assertPermission(Permissions.CONNECTION_VIEW);
        agentPermissionService.assertPermission(Permissions.CONNECTION_BROWSE_SCHEMA);
        return connectionService.getTableMetadata(connectionId, tableName);
    }

    @Tool(description = "Compute topologically sorted migration order for tables based on foreign keys.")
    public SmartOrderResponse computeSmartTableOrder(@ToolParam(description = "Database connection ID") String connectionId,
                                                     @ToolParam(description = "Table names to sort") List<String> tableNames) {
        agentPermissionService.assertPermission(Permissions.CONNECTION_VIEW);
        agentPermissionService.assertPermission(Permissions.CONNECTION_BROWSE_SCHEMA);
        return tableOrderService.smartOrder(SmartOrderRequest.builder().connectionId(connectionId).tableNames(tableNames).build());
    }

    @Tool(description = "Get full configuration of a pipeline by pipelineId.")
    public PipelineResponse getPipelineDetails(@ToolParam(description = "Pipeline ID") String pipelineId) {
        agentPermissionService.assertPermission(Permissions.PIPELINE_VIEW);
        return pipelineService.getById(pipelineId);
    }

    @Tool(description = "List registered Java UDFs and methods available for column transformations.")
    public List<UdfResponse> listUdfs() {
        agentPermissionService.assertPermission(Permissions.UDF_VIEW);
        return udfRegistryService.getAll();
    }

    @Tool(description = "List all available installed adapters and marketplace connectors in the workspace.")
    public List<AdapterResponse> listAdapters() {
        agentPermissionService.assertPermission(Permissions.ADAPTER_VIEW);
        String orgId = UserContext.getCurrentOrgId();
        if (orgId == null || orgId.isBlank()) return List.of();
        Set<String> pKeys = purchasedRepo.findByOrganizationIdAndStatus(orgId, "ACTIVE").stream()
                .filter(p -> p.getMarketplaceItem() != null).map(p -> p.getMarketplaceItem().getAdapterKey()).collect(Collectors.toSet());
        return adapterRepo.findAllAvailableForOrg(orgId).stream()
                .filter(d -> orgId.equals(d.getOrganizationId()) || pKeys.contains(d.getAdapterKey()))
                .map(d -> AdapterResponse.builder().id(d.getId()).name(d.getName()).adapterKey(d.getAdapterKey()).description(d.getDescription()).adapterType(d.getAdapterType()).supportedMode(d.getSupportedMode()).isOfficial(Boolean.TRUE.equals(d.getIsOfficial())).build())
                .toList();
    }

    @Tool(description = "Get error summary and failed row logs for debugging a pipeline.")
    public ErrorSummaryResponse getPipelineErrorLogs(@ToolParam(description = "Pipeline ID") String pId, @ToolParam(description = "Page") int pg, @ToolParam(description = "Size") int sz) {
        agentPermissionService.assertPermission(Permissions.MONITOR_VIEW_ERRORS);
        return monitorService.getErrorSummary(pId, Math.max(0, pg), Math.min(20, Math.max(1, sz)));
    }

    @Tool(description = "Get error summary and failed stage logs across a workflow.")
    public ErrorSummaryResponse getWorkflowErrorLogs(@ToolParam(description = "Workflow ID") String wfId, @ToolParam(description = "Pipeline filter") String pFilter, @ToolParam(description = "Page") int pg, @ToolParam(description = "Size") int sz) {
        agentPermissionService.assertPermission(Permissions.MONITOR_VIEW_ERRORS);
        return monitorService.getWorkflowErrorSummary(wfId, pFilter, Math.max(0, pg), Math.min(20, Math.max(1, sz)));
    }
}
