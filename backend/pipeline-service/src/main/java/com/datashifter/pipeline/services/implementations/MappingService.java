package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.dtos.MappingDtos.*;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import com.datashifter.connector.factories.ConnectorFactory;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.common.utils.EncryptionUtil;
import com.datashifter.pipeline.repositories.PipelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MappingService {

    private final PipelineRepository pipelineRepository;
    private final ConnectorFactory connectorFactory;
    private final com.datashifter.connector.repositories.ConnectionRepository connectionRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public MappingResponse getMappings(String pipelineId) {
        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline", pipelineId));

        Connection sourceConn = connectionRepository.findById(pipeline.getSourceConnectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Source connection", pipeline.getSourceConnectionId()));
        Connection targetConn = connectionRepository.findById(pipeline.getTargetConnectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Target connection", pipeline.getTargetConnectionId()));

        ConnectionConfig sourceConfig = toConfig(sourceConn);
        ConnectionConfig targetConfig = toConfig(targetConn);

        DatabaseConnector sourceConnector = connectorFactory.getConnector(sourceConn.getDbType());
        DatabaseConnector targetConnector = connectorFactory.getConnector(targetConn.getDbType());

        Map<String, List<ColumnMetadata>> sourceColumnCache = new HashMap<>();
        Map<String, List<ColumnMetadata>> targetColumnCache = new HashMap<>();

        List<TablePairMapping> tablePairs = new ArrayList<>();

        for (PipelineTable pt : pipeline.getPipelineTables()) {
            List<ColumnMetadata> sourceCols = sourceColumnCache.computeIfAbsent(
                    pt.getSourceTable(),
                    table -> {
                        try { return sourceConnector.getColumns(sourceConfig, table); }
                        catch (Exception e) { log.warn("Failed to fetch source columns for {}: {}", table, e.getMessage()); return List.of(); }
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
                            try { return targetConnector.getColumns(targetConfig, table); }
                            catch (Exception e) { log.warn("Failed to fetch target columns for {}: {}", table, e.getMessage()); return List.of(); }
                        });

                Set<String> mappedSourceCols = ttm.getColumnMappings().stream().map(ColumnMapping::getSourceColumn).collect(Collectors.toSet());
                Set<String> mappedTargetCols = ttm.getColumnMappings().stream().map(ColumnMapping::getTargetColumn).collect(Collectors.toSet());

                List<ColumnInfo> sourceColInfo = sourceCols.stream()
                        .map(c -> ColumnInfo.builder().name(c.getColumnName()).dataType(c.getDataType()).nullable(c.isNullable()).primaryKey(c.isPrimaryKey()).mapped(mappedSourceCols.contains(c.getColumnName())).build())
                        .toList();

                List<ColumnInfo> targetColInfo = targetCols.stream()
                        .map(c -> ColumnInfo.builder().name(c.getColumnName()).dataType(c.getDataType()).nullable(c.isNullable()).primaryKey(c.isPrimaryKey()).mapped(mappedTargetCols.contains(c.getColumnName())).build())
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
        List<String> errors = new ArrayList<>();
        if (pipeline.getPipelineTables() == null || pipeline.getPipelineTables().isEmpty()) {
            errors.add("Pipeline has no tables configured");
            return errors;
        }

        Connection targetConn = connectionRepository.findById(pipeline.getTargetConnectionId()).orElse(null);
        if (targetConn == null) {
            errors.add("Target connection not found: " + pipeline.getTargetConnectionId());
            return errors;
        }

        DatabaseConnector targetConnector = connectorFactory.getConnector(targetConn.getDbType());
        ConnectionConfig targetConfig = toConfig(targetConn);

        Map<String, List<ColumnMetadata>> targetColumnCache = new HashMap<>();

        for (PipelineTable pt : pipeline.getPipelineTables()) {
            if (pt.getTargetTableMappings() == null || pt.getTargetTableMappings().isEmpty()) {
                errors.add(String.format("Source table '%s' has no target table mapped", pt.getSourceTable()));
                continue;
            }

            for (TargetTableMapping ttm : pt.getTargetTableMappings()) {
                String targetTable = ttm.getTargetTable();
                if (targetTable == null || targetTable.isBlank()) {
                    errors.add(String.format("Source table '%s' has an empty target table name", pt.getSourceTable()));
                    continue;
                }

                List<ColumnMetadata> targetCols;
                try {
                    targetCols = targetColumnCache.computeIfAbsent(targetTable, t -> {
                        try {
                            return targetConnector.getColumns(targetConfig, t);
                        } catch (Exception e) {
                            throw new RuntimeException(e);
                        }
                    });
                } catch (Exception e) {
                    log.warn("Failed to fetch target columns for table {}: {}", targetTable, e.getMessage());
                    errors.add(String.format("Unable to fetch schema for target table '%s'", targetTable));
                    continue;
                }

                if (targetCols == null || targetCols.isEmpty()) {
                    errors.add(String.format("Target table '%s' has no columns or does not exist", targetTable));
                    continue;
                }

                Set<String> mappedTargetCols = new HashSet<>();
                if (ttm.getColumnMappings() != null) {
                    for (ColumnMapping cm : ttm.getColumnMappings()) {
                        if (cm.getTargetColumn() != null && !cm.getTargetColumn().isBlank()) {
                            mappedTargetCols.add(cm.getTargetColumn().trim().toLowerCase());
                        }
                    }
                }

                if (mappedTargetCols.isEmpty()) {
                    errors.add(String.format("%s: At least one column must be mapped", targetTable));
                }

                for (ColumnMetadata col : targetCols) {
                    boolean isMapped = mappedTargetCols.contains(col.getColumnName().toLowerCase());
                    if (!col.isNullable() && !isMapped) {
                        errors.add(String.format("%s: \"%s\" is %s — needs mapping",
                                targetTable,
                                col.getColumnName(),
                                col.isPrimaryKey() ? "PK" : "NOT NULL"));
                    } else if (col.isPrimaryKey() && !isMapped
                            && (ttm.getWriteMode() == com.datashifter.common.enums.WriteMode.UPSERT
                            || ttm.getWriteMode() == com.datashifter.common.enums.WriteMode.UPDATE_ONLY)) {
                        errors.add(String.format("%s: Primary key \"%s\" must be mapped for %s write mode",
                                targetTable,
                                col.getColumnName(),
                                ttm.getWriteMode()));
                    }
                }
            }
        }

        return errors;
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