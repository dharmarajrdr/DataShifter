package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.dtos.MappingDtos.*;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import com.datashifter.connector.factories.ConnectorFactory;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.common.utils.DdlSchemaParser;
import com.datashifter.common.utils.EncryptionUtil;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.validation.PipelineValidationChain;
import com.datashifter.pipeline.validation.steps.ColumnMappingValidationStep;
import com.datashifter.pipeline.validation.PipelineValidationContext;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MappingService {

    private final PipelineRepository pipelineRepository;
    private final ConnectorFactory connectorFactory;
    private final com.datashifter.connector.repositories.ConnectionRepository connectionRepository;
    private final ObjectMapper objectMapper;
    private final PipelineValidationChain validationChain;

    public MappingService(
            PipelineRepository pipelineRepository,
            ConnectorFactory connectorFactory,
            com.datashifter.connector.repositories.ConnectionRepository connectionRepository,
            ObjectMapper objectMapper) {
        this(pipelineRepository, connectorFactory, connectionRepository, objectMapper, new PipelineValidationChain());
    }

    @Autowired
    public MappingService(
            PipelineRepository pipelineRepository,
            ConnectorFactory connectorFactory,
            com.datashifter.connector.repositories.ConnectionRepository connectionRepository,
            ObjectMapper objectMapper,
            PipelineValidationChain validationChain) {
        this.pipelineRepository = pipelineRepository;
        this.connectorFactory = connectorFactory;
        this.connectionRepository = connectionRepository;
        this.objectMapper = objectMapper;
        this.validationChain = validationChain != null ? validationChain : new PipelineValidationChain();
    }

    @Transactional(readOnly = true)
    @Tool(description = "Get complete table pair mappings, live source and target column metadata, column mappings, transformations, filters, and validation errors for a pipeline by ID.")
    public MappingResponse getMappings(
            @ToolParam(description = "The unique ID of the pipeline to fetch column and table mappings for") String pipelineId) {
        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline", pipelineId));

        Connection sourceConn = pipeline.getSourceConnectionId() != null
                ? connectionRepository.findById(pipeline.getSourceConnectionId()).orElse(null)
                : null;
        Connection targetConn = pipeline.getTargetConnectionId() != null
                ? connectionRepository.findById(pipeline.getTargetConnectionId()).orElse(null)
                : null;

        ConnectionConfig sourceConfig = sourceConn != null ? toConfig(sourceConn) : null;
        ConnectionConfig targetConfig = targetConn != null ? toConfig(targetConn) : null;

        DatabaseConnector sourceConnector = sourceConn != null && sourceConn.getDbType() != null
                ? connectorFactory.getConnector(sourceConn.getDbType()) : null;
        DatabaseConnector targetConnector = targetConn != null && targetConn.getDbType() != null
                ? connectorFactory.getConnector(targetConn.getDbType()) : null;

        Map<String, List<ColumnMetadata>> sourceColumnCache = new HashMap<>();
        Map<String, List<ColumnMetadata>> targetColumnCache = new HashMap<>();

        List<TablePairMapping> tablePairs = new ArrayList<>();

        for (PipelineTable pt : pipeline.getPipelineTables()) {
            List<ColumnMetadata> sourceCols = sourceColumnCache.computeIfAbsent(
                    pt.getSourceTable(),
                    table -> {
                        if (sourceConnector != null && sourceConfig != null) {
                            try {
                                List<ColumnMetadata> cols = sourceConnector.getColumns(sourceConfig, table);
                                if (cols != null && !cols.isEmpty()) return cols;
                            } catch (Exception e) {
                                log.warn("Failed to fetch source columns for {}: {}", table, e.getMessage());
                            }
                        }
                        if (pt.getSourceSchemaSql() != null && !pt.getSourceSchemaSql().isBlank()) {
                            return DdlSchemaParser.parseColumns(pt.getSourceSchemaSql());
                        }
                        return List.of();
                    });

            // Build filter entries for this source table
            List<FilterEntry> filterEntries = pt.getFilters().stream()
                    .sorted(Comparator.comparing(Filter::getFilterOrder))
                    .map(f -> FilterEntry.builder()
                            .id(f.getId())
                            .columnName(f.getColumnName())
                            .operator(f.getOperator())
                            .value(f.getValue())
                            .logicalOperator(f.getLogicalOperator())
                            .filterOrder(f.getFilterOrder())
                            .build())
                    .toList();

            for (TargetTableMapping ttm : pt.getTargetTableMappings()) {
                List<ColumnMetadata> targetCols = targetColumnCache.computeIfAbsent(
                        ttm.getTargetTable(),
                        table -> {
                            if (targetConnector != null && targetConfig != null) {
                                try {
                                    List<ColumnMetadata> cols = targetConnector.getColumns(targetConfig, table);
                                    if (cols != null && !cols.isEmpty()) return cols;
                                } catch (Exception e) {
                                    log.warn("Failed to fetch target columns for {}: {}", table, e.getMessage());
                                }
                            }
                            return List.of();
                        });

                Set<String> mappedSourceCols = ttm.getColumnMappings().stream()
                        .map(ColumnMapping::getSourceColumn)
                        .filter(s -> s != null && !s.isBlank())
                        .map(s -> s.trim().toLowerCase())
                        .collect(Collectors.toSet());
                Set<String> mappedTargetCols = ttm.getColumnMappings().stream()
                        .filter(ColumnMappingValidationStep::isTargetColumnMapped)
                        .map(cm -> cm.getTargetColumn().trim().toLowerCase())
                        .collect(Collectors.toSet());

                List<ColumnInfo> sourceColInfo = sourceCols.stream()
                        .map(c -> ColumnInfo.builder().name(c.getColumnName()).dataType(c.getDataType()).nullable(c.isNullable()).primaryKey(c.isPrimaryKey()).mapped(mappedSourceCols.contains(c.getColumnName().trim().toLowerCase())).build())
                        .toList();

                List<ColumnInfo> targetColInfo = targetCols.stream()
                        .map(c -> ColumnInfo.builder().name(c.getColumnName()).dataType(c.getDataType()).nullable(c.isNullable()).primaryKey(c.isPrimaryKey()).mapped(mappedTargetCols.contains(c.getColumnName().trim().toLowerCase())).build())
                        .toList();

                List<ColumnMappingEntry> mappingEntries = ttm.getColumnMappings().stream()
                        .map(cm -> ColumnMappingEntry.builder()
                                .id(cm.getId()).sourceColumn(cm.getSourceColumn()).sourceType(cm.getSourceType())
                                .targetColumn(cm.getTargetColumn()).targetType(cm.getTargetType()).defaultValue(cm.getDefaultValue())
                                .transforms(cm.getTransformations().stream()
                                        .sorted(Comparator.comparing(Transformation::getExecutionOrder))
                                        .map(t -> TransformEntry.builder().id(t.getId()).fn(t.getFunctionName()).args(t.getArguments()).order(t.getExecutionOrder()).build())
                                        .toList())
                                .build())
                        .toList();

                tablePairs.add(TablePairMapping.builder()
                        .pipelineTableId(pt.getId())
                        .targetTableMappingId(ttm.getId())
                        .sourceTable(pt.getSourceTable())
                        .targetTable(ttm.getTargetTable())
                        .sourceSchemaSql(pt.getSourceSchemaSql())
                        .writeMode(ttm.getWriteMode())
                        .executionOrder(pt.getExecutionOrder())
                        .sourceColumns(sourceColInfo)
                        .targetColumns(targetColInfo)
                        .mappings(mappingEntries)
                        .filters(filterEntries)
                        .build());
            }

            // No target mappings — still show source table with filters
            if (pt.getTargetTableMappings().isEmpty()) {
                List<ColumnInfo> sourceColInfo = sourceCols.stream()
                        .map(c -> ColumnInfo.builder().name(c.getColumnName()).dataType(c.getDataType()).nullable(c.isNullable()).primaryKey(c.isPrimaryKey()).mapped(false).build())
                        .toList();

                tablePairs.add(TablePairMapping.builder()
                        .pipelineTableId(pt.getId())
                        .sourceTable(pt.getSourceTable())
                        .targetTable(null)
                        .sourceSchemaSql(pt.getSourceSchemaSql())
                        .writeMode(pipeline.getDefaultWriteMode())
                        .executionOrder(pt.getExecutionOrder())
                        .sourceColumns(sourceColInfo)
                        .targetColumns(List.of())
                        .mappings(List.of())
                        .filters(filterEntries)
                        .build());
            }
        }

        return MappingResponse.builder()
                .pipelineId(pipeline.getId())
                .pipelineName(pipeline.getName())
                .sourceConnectionId(pipeline.getSourceConnectionId())
                .targetConnectionId(pipeline.getTargetConnectionId())
                .defaultWriteMode(pipeline.getDefaultWriteMode())
                .status(pipeline.getStatus())
                .validationErrors(parseValidationErrors(pipeline.getValidationErrors()))
                .tablePairs(tablePairs)
                .build();
    }

    @Transactional(readOnly = true)
    public List<String> validatePipeline(Pipeline pipeline) {
        if (pipeline.getPipelineTables() == null || pipeline.getPipelineTables().isEmpty()) {
            return List.of("Pipeline has no tables configured");
        }

        Connection targetConn = pipeline.getTargetConnectionId() != null
                ? connectionRepository.findById(pipeline.getTargetConnectionId()).orElse(null)
                : null;
        if (targetConn == null && pipeline.getTargetAdapterId() == null) {
            return List.of("Target connection not found: " + pipeline.getTargetConnectionId());
        }

        DatabaseConnector targetConnector = targetConn != null
                ? connectorFactory.getConnector(targetConn.getDbType())
                : null;
        ConnectionConfig targetConfig = targetConn != null
                ? toConfig(targetConn)
                : null;

        Connection sourceConn = pipeline.getSourceConnectionId() != null
                ? connectionRepository.findById(pipeline.getSourceConnectionId()).orElse(null)
                : null;
        DatabaseConnector sourceConnector = sourceConn != null
                ? connectorFactory.getConnector(sourceConn.getDbType())
                : null;
        ConnectionConfig sourceConfig = sourceConn != null
                ? toConfig(sourceConn)
                : null;

        PipelineValidationContext context = PipelineValidationContext.builder()
                .pipeline(pipeline)
                .sourceConnection(sourceConn)
                .targetConnection(targetConn)
                .sourceConnector(sourceConnector)
                .targetConnector(targetConnector)
                .sourceConfig(sourceConfig)
                .targetConfig(targetConfig)
                .build();

        return validationChain.execute(context);
    }

    public List<String> parseValidationErrors(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of(json);
        }
    }

    private ConnectionConfig toConfig(Connection conn) {
        return ConnectionConfig.builder()
                .connectionId(conn.getId())
                .dbType(conn.getDbType())
                .host(conn.getHost())
                .port(conn.getPort())
                .databaseName(conn.getDatabaseName())
                .schemaName(conn.getSchemaName())
                .username(conn.getUsername())
                .password(EncryptionUtil.decrypt(conn.getEncryptedPassword()))
                .build();
    }
}