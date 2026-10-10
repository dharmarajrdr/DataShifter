package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.enums.TableMappingType;
import com.datashifter.common.enums.WriteMode;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import com.datashifter.common.enums.Permissions;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.services.SubscriptionLimitChecker;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.statemachine.PipelineStateMachine;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.datashifter.common.enums.LogicalOperator;

import com.fasterxml.jackson.databind.ObjectMapper;
@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineServiceImpl implements PipelineService {

    private final PipelineRepository repository;
    private final EntityManager entityManager;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final com.datashifter.pipeline.repositories.NamespaceRepository namespaceRepository;
    private final StringRedisTemplate redisTemplate;
    private final SubscriptionLimitChecker limitChecker;
    private final MappingService mappingService;
    private final ObjectMapper objectMapper;
    private final com.datashifter.connector.repositories.ConnectionRepository connectionRepository;

    // =========================================================================
    // CREATE — builds PipelineTable + TargetTableMapping entries
    // =========================================================================

    @Override
    @Transactional
    public PipelineResponse create(CreatePipelineRequest req) {
        // Enforce subscription limit
        String orgId = UserContext.getCurrentOrgId();
        long currentCount = repository.findByOrgId(orgId).size();
        limitChecker.assertCanCreatePipeline(orgId, currentCount);

        // Resolve namespace
        Namespace namespace = null;
        if (req.getNamespaceId() != null && !req.getNamespaceId().isBlank()) {
            namespace = namespaceRepository.findById(req.getNamespaceId()).orElse(null);
        }

        String userId = UserContext.getCurrentUserId();
        AppUser createdBy = entityManager.getReference(AppUser.class, userId);

        Pipeline entity = Pipeline.builder()
                .name(req.getName())
                .description(req.getDescription())
                .namespace(namespace)
                .createdBy(createdBy)
                .sourceConnectionId(req.getSourceConnectionId())
                .targetConnectionId(req.getTargetConnectionId())
                .chunkSize(req.getChunkSize() != null ? req.getChunkSize() : 10000)
                .defaultWriteMode(req.getDefaultWriteMode() != null ? req.getDefaultWriteMode() : WriteMode.UPSERT)
                .ignoreExceptions(req.getIgnoreExceptions() != null ? req.getIgnoreExceptions() : false)
                .maxErrorThreshold(req.getMaxErrorThreshold() != null ? req.getMaxErrorThreshold() : 1000)
                .logSourceRow(req.getLogSourceRow() != null ? req.getLogSourceRow() : true)
                .build();

        // Create PipelineTable entries for each source table
        if (req.getTables() != null) {
            List<String> targetTableNames = req.getTargetTables() != null ? req.getTargetTables() : List.of();

            for (PipelineTableRequest tReq : req.getTables()) {
                PipelineTable pt = PipelineTable.builder()
                        .pipeline(entity)
                        .sourceTable(tReq.getSourceTable())
                        .executionOrder(tReq.getExecutionOrder())
                        .mappingType(determineMappingType(targetTableNames.size()))
                        .build();

                // Create TargetTableMapping for each selected target table
                // This creates the source→target pairs that the user will later map columns for
                if (tReq.getTargetMappings() != null && !tReq.getTargetMappings().isEmpty()) {
                    // If frontend sent explicit target mappings, use those
                    for (TargetTableMappingRequest ttReq : tReq.getTargetMappings()) {
                        TargetTableMapping ttm = TargetTableMapping.builder()
                                .pipelineTable(pt)
                                .targetTable(ttReq.getTargetTable())
                                .writeMode(ttReq.getWriteMode() != null ? ttReq.getWriteMode() : entity.getDefaultWriteMode())
                                .build();
                        pt.getTargetTableMappings().add(ttm);
                    }
                } else if (!targetTableNames.isEmpty()) {
                    // Otherwise, create empty TargetTableMapping for each selected target table
                    for (String targetTable : targetTableNames) {
                        TargetTableMapping ttm = TargetTableMapping.builder()
                                .pipelineTable(pt)
                                .targetTable(targetTable)
                                .writeMode(entity.getDefaultWriteMode())
                                .build();
                        pt.getTargetTableMappings().add(ttm);
                    }
                }

                entity.getPipelineTables().add(pt);
            }
        }

        entity = repository.save(entity);
        log.info("Pipeline created: {} with {} source tables × {} target mappings",
                entity.getName(), entity.getPipelineTables().size(),
                entity.getPipelineTables().stream().mapToInt(pt -> pt.getTargetTableMappings().size()).sum());

        return toFullResponse(entity);
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    @Override
    @Transactional
    public PipelineResponse update(String id, UpdatePipelineRequest req) {
        Pipeline entity = findEntity(id);

        if (entity.getStatus() == PipelineStatus.RUNNING) {
            throw new DatashifterException("Cannot update settings while the pipeline is running. Pause the pipeline first.");
        }

        if (req.getName() != null) entity.setName(req.getName());
        if (req.getDescription() != null) entity.setDescription(req.getDescription());
        if (req.getChunkSize() != null) entity.setChunkSize(req.getChunkSize());
        if (req.getDefaultWriteMode() != null) entity.setDefaultWriteMode(req.getDefaultWriteMode());
        if (req.getIgnoreExceptions() != null) entity.setIgnoreExceptions(req.getIgnoreExceptions());
        if (req.getMaxErrorThreshold() != null) entity.setMaxErrorThreshold(req.getMaxErrorThreshold());
        if (req.getLogSourceRow() != null) entity.setLogSourceRow(req.getLogSourceRow());
        if (req.getSourcePoolSize() != null) entity.setSourcePoolSize(req.getSourcePoolSize());
        if (req.getTargetPoolSize() != null) entity.setTargetPoolSize(req.getTargetPoolSize());
        if (req.getPreviewInflightRecords() != null) entity.setPreviewInflightRecords(req.getPreviewInflightRecords());

        // Per-table write mode overrides
        if (req.getTableWriteModeOverrides() != null && !req.getTableWriteModeOverrides().isEmpty()) {
            for (var override : req.getTableWriteModeOverrides()) {
                entity.getPipelineTables().stream()
                        .flatMap(pt -> pt.getTargetTableMappings().stream())
                        .filter(ttm -> ttm.getId().equals(override.getTargetTableMappingId()))
                        .findFirst()
                        .ifPresent(ttm -> ttm.setWriteMode(override.getWriteMode()));
            }
            entity.setStatus(PipelineStatus.NOT_VALIDATED);
            entity.setValidationErrors(null);
        }

        return toFullResponse(repository.save(entity));
    }

    // =========================================================================
    // TABLE PAIR MANAGEMENT
    // =========================================================================

    @Override
    @Transactional
    public PipelineResponse addTablePair(String pipelineId, AddTablePairRequest request) {
        Pipeline pipeline = findEntity(pipelineId);

        // Check for duplicate
        boolean exists = pipeline.getPipelineTables().stream()
                .anyMatch(pt -> pt.getSourceTable().equals(request.getSourceTable())
                        && pt.getTargetTableMappings().stream()
                        .anyMatch(ttm -> ttm.getTargetTable().equals(request.getTargetTable())));
        if (exists) {
            throw new DatashifterException(String.format(
                    "Table pair %s → %s already exists", request.getSourceTable(), request.getTargetTable()));
        }

        int nextOrder = pipeline.getPipelineTables().size();

        PipelineTable pt = PipelineTable.builder()
                .pipeline(pipeline)
                .sourceTable(request.getSourceTable())
                .executionOrder(nextOrder)
                .mappingType(TableMappingType.ONE_TO_ONE)
                .build();

        TargetTableMapping ttm = TargetTableMapping.builder()
                .pipelineTable(pt)
                .targetTable(request.getTargetTable())
                .writeMode(pipeline.getDefaultWriteMode())
                .build();

        pt.getTargetTableMappings().add(ttm);
        pipeline.getPipelineTables().add(pt);
        pipeline.setStatus(PipelineStatus.NOT_VALIDATED);
        pipeline.setValidationErrors(null);

        log.info("Added table pair: {} → {} to pipeline {}", request.getSourceTable(), request.getTargetTable(), pipelineId);
        return toFullResponse(repository.save(pipeline));
    }

    @Override
    @Transactional
    public PipelineResponse removeTablePair(String pipelineId, String pipelineTableId) {
        Pipeline pipeline = findEntity(pipelineId);

        boolean removed = pipeline.getPipelineTables().removeIf(pt -> pt.getId().equals(pipelineTableId));
        if (!removed) {
            throw new ResourceNotFoundException("PipelineTable", pipelineTableId);
        }

        // Re-order remaining tables
        int order = 0;
        for (PipelineTable pt : pipeline.getPipelineTables()) {
            pt.setExecutionOrder(order++);
        }
        pipeline.setStatus(PipelineStatus.NOT_VALIDATED);
        pipeline.setValidationErrors(null);

        log.info("Removed table pair {} from pipeline {}", pipelineTableId, pipelineId);
        return toFullResponse(repository.save(pipeline));
    }

    // =========================================================================
    // GET
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public PipelineResponse getById(String id) {
        return toFullResponse(findEntity(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PipelineSummaryResponse> getAll() {
        String orgId = UserContext.getCurrentOrgId();
        return repository.findByOrgId(orgId).stream().map(this::toSummary).collect(Collectors.toList());
    }

    // =========================================================================
    // DELETE
    // =========================================================================

    @Override
    @Transactional
    public void delete(String id) {
        Pipeline entity = findEntity(id);
        if (entity.getStatus() == PipelineStatus.RUNNING) {
            throw new DatashifterException("Cannot delete a running pipeline. Pause or stop it first.");
        }
        repository.deleteById(id);
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    @Override
    @Transactional
    public PipelineResponse performAction(String id, PipelineActionRequest action) {
        Pipeline entity = findEntity(id);

        switch (action.getAction()) {
            case VALIDATE:
                UserContext.assertPermission(Permissions.PIPELINE_EDIT);
                List<String> valErrors = mappingService.validatePipeline(entity);
                if (valErrors.isEmpty()) {
                    PipelineStateMachine.validateTransition(entity.getStatus(), PipelineStatus.VALIDATED);
                    entity.setStatus(PipelineStatus.VALIDATED);
                    entity.setValidationErrors(null);
                } else {
                    PipelineStateMachine.validateTransition(entity.getStatus(), PipelineStatus.INVALID);
                    entity.setStatus(PipelineStatus.INVALID);
                    try {
                        entity.setValidationErrors(objectMapper.writeValueAsString(valErrors));
                    } catch (Exception ex) {
                        entity.setValidationErrors(String.join("\n", valErrors));
                    }
                }
                break;

            case START:
            case RESUME:
                UserContext.assertPermission(Permissions.PIPELINE_RUN);
                if (entity.getStatus() != PipelineStatus.VALIDATED
                        && entity.getStatus() != PipelineStatus.PAUSED
                        && entity.getStatus() != PipelineStatus.COMPLETED
                        && entity.getStatus() != PipelineStatus.ERRORED) {
                    throw new DatashifterException("Pipeline must be validated before it can be started.");
                }

                // Enforce parallel pipeline limit
                String orgId2 = UserContext.getCurrentOrgId();
                long runningCount = repository.findByOrgId(orgId2).stream()
                        .filter(p -> p.getStatus() == PipelineStatus.RUNNING).count();
                limitChecker.assertCanRunParallel(orgId2, runningCount);

                PipelineStatus target = PipelineStatus.RUNNING;
                PipelineStateMachine.validateTransition(entity.getStatus(), target);
                entity.setStatus(target);
                repository.save(entity);
                kafkaTemplate.send(KafkaTopics.PIPELINE_JOBS,
                        PipelineJobEvent.builder()
                                .pipelineId(id)
                                .action(action.getAction().name())
                                .timestamp(Instant.now())
                                .build());
                break;

            case PAUSE:
                UserContext.assertPermission(Permissions.PIPELINE_PAUSE);
                PipelineStateMachine.validateTransition(entity.getStatus(), PipelineStatus.PAUSED);
                entity.setStatus(PipelineStatus.PAUSED);  // Update DB immediately
                repository.save(entity);
                kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                        PipelineCommandEvent.builder()
                                .pipelineId(id).command("PAUSE").timestamp(Instant.now()).build());
                break;

            case STOP:
                UserContext.assertPermission(Permissions.PIPELINE_STOP);
                entity.setStatus(PipelineStatus.ERRORED);  // Update DB immediately
                repository.save(entity);
                kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                        PipelineCommandEvent.builder()
                                .pipelineId(id).command("STOP").timestamp(Instant.now()).build());
                break;
        }

        return toFullResponse(repository.save(entity));
    }

    // =========================================================================
    // UPDATE MAPPINGS
    // =========================================================================

    @Override
    @Transactional
    public PipelineResponse updateMappings(String pipelineId, List<PipelineTableRequest> tables) {
        Pipeline entity = findEntity(pipelineId);
        entity.getPipelineTables().clear();

        if (tables != null) {
            for (PipelineTableRequest tReq : tables) {
                PipelineTable pt = PipelineTable.builder()
                        .pipeline(entity)
                        .sourceTable(tReq.getSourceTable())
                        .executionOrder(tReq.getExecutionOrder())
                        .mappingType(tReq.getMappingType() != null ? tReq.getMappingType() : TableMappingType.ONE_TO_ONE)
                        .build();

                if (tReq.getTargetMappings() != null) {
                    for (TargetTableMappingRequest ttReq : tReq.getTargetMappings()) {
                        TargetTableMapping ttm = TargetTableMapping.builder()
                                .pipelineTable(pt)
                                .targetTable(ttReq.getTargetTable())
                                .writeMode(ttReq.getWriteMode() != null ? ttReq.getWriteMode() : entity.getDefaultWriteMode())
                                .build();

                        if (ttReq.getColumnMappings() != null) {
                            for (ColumnMappingRequest cmReq : ttReq.getColumnMappings()) {
                                ColumnMapping cm = ColumnMapping.builder()
                                        .targetTableMapping(ttm)
                                        .sourceColumn(cmReq.getSourceColumn())
                                        .sourceType(cmReq.getSourceType())
                                        .targetColumn(cmReq.getTargetColumn())
                                        .targetType(cmReq.getTargetType())
                                        .mappingOrder(cmReq.getMappingOrder())
                                        .defaultValue(cmReq.getDefaultValue())
                                        .build();

                                if (cmReq.getTransformations() != null) {
                                    for (TransformationRequest trReq : cmReq.getTransformations()) {
                                        cm.getTransformations().add(Transformation.builder()
                                                .columnMapping(cm)
                                                .functionName(trReq.getFunctionName())
                                                .arguments(trReq.getArguments())
                                                .executionOrder(trReq.getExecutionOrder())
                                                .build());
                                    }
                                }
                                ttm.getColumnMappings().add(cm);
                            }
                        }
                        pt.getTargetTableMappings().add(ttm);
                    }
                }

                if (tReq.getFilters() != null) {
                    for (FilterRequest fReq : tReq.getFilters()) {
                        pt.getFilters().add(Filter.builder()
                                .pipelineTable(pt)
                                .columnName(fReq.getColumnName())
                                .operator(fReq.getOperator())
                                .value(fReq.getValue())
                                .logicalOperator(fReq.getLogicalOperator())
                                .filterOrder(fReq.getFilterOrder())
                                .build());
                    }
                }

                entity.getPipelineTables().add(pt);
            }
        }

        entity.setStatus(PipelineStatus.NOT_VALIDATED);
        entity.setValidationErrors(null);

        return toFullResponse(repository.save(entity));
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private Pipeline findEntity(String id) {
        Pipeline pipeline = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pipeline", id));
        String currentOrgId = UserContext.getCurrentOrgId();
        if (currentOrgId != null && pipeline.getCreatedBy() != null
                && pipeline.getCreatedBy().getOrganization() != null
                && !currentOrgId.equals(pipeline.getCreatedBy().getOrganization().getId())) {
            throw new DatashifterException("Pipeline not found or access denied");
        }
        return pipeline;
    }

    /**
     * Determine mapping type based on number of target tables.
     * 1 target = ONE_TO_ONE, multiple targets = ONE_TO_MANY
     */
    private TableMappingType determineMappingType(int targetCount) {
        if (targetCount <= 1) return TableMappingType.ONE_TO_ONE;
        return TableMappingType.ONE_TO_MANY;
    }

    /**
     * Convert Pipeline entity to full response including table details.
     */
    private PipelineResponse toFullResponse(Pipeline e) {
        List<PipelineTableResponse> tableResponses = e.getPipelineTables().stream()
                .sorted(Comparator.comparing(PipelineTable::getExecutionOrder))
                .map(pt -> PipelineTableResponse.builder()
                        .id(pt.getId())
                        .sourceTable(pt.getSourceTable())
                        .executionOrder(pt.getExecutionOrder())
                        .mappingType(pt.getMappingType())
                        .targetMappings(pt.getTargetTableMappings().stream()
                                .map(ttm -> TargetTableMappingResponse.builder()
                                        .id(ttm.getId())
                                        .targetTable(ttm.getTargetTable())
                                        .writeMode(ttm.getWriteMode())
                                        .columnMappings(ttm.getColumnMappings().stream()
                                                .map(cm -> ColumnMappingResponse.builder()
                                                        .id(cm.getId())
                                                        .sourceColumn(cm.getSourceColumn())
                                                        .sourceType(cm.getSourceType())
                                                        .targetColumn(cm.getTargetColumn())
                                                        .targetType(cm.getTargetType())
                                                        .mappingOrder(cm.getMappingOrder())
                                                        .defaultValue(cm.getDefaultValue())
                                                        .transformations(cm.getTransformations().stream()
                                                                .map(t -> TransformationResponse.builder()
                                                                        .id(t.getId())
                                                                        .functionName(t.getFunctionName())
                                                                        .arguments(t.getArguments())
                                                                        .executionOrder(t.getExecutionOrder())
                                                                        .build())
                                                                .toList())
                                                        .build())
                                                .toList())
                                        .build())
                                .toList())
                        .filters(pt.getFilters().stream()
                                .map(f -> FilterResponse.builder()
                                        .id(f.getId())
                                        .columnName(f.getColumnName())
                                        .operator(f.getOperator())
                                        .value(f.getValue())
                                        .logicalOperator(f.getLogicalOperator())
                                        .filterOrder(f.getFilterOrder())
                                        .build())
                                .toList())
                        .build())
                .toList();

        return PipelineResponse.builder()
                .id(e.getId()).name(e.getName()).description(e.getDescription())
                .sourceConnectionId(e.getSourceConnectionId()).targetConnectionId(e.getTargetConnectionId())
                .status(e.getStatus()).chunkSize(e.getChunkSize()).defaultWriteMode(e.getDefaultWriteMode())
                .ignoreExceptions(e.getIgnoreExceptions()).maxErrorThreshold(e.getMaxErrorThreshold())
                .logSourceRow(e.getLogSourceRow())
                .sourcePoolSize(e.getSourcePoolSize()).targetPoolSize(e.getTargetPoolSize())
                .previewInflightRecords(e.getPreviewInflightRecords())
                .tables(tableResponses)
                .validationErrors(mappingService.parseValidationErrors(e.getValidationErrors()))
                .createdAt(e.getCreatedAt()).updatedAt(e.getUpdatedAt())
                .build();
    }

    private PipelineSummaryResponse toSummary(Pipeline e) {

        AppUser createdBy = e.getCreatedBy();

        double progress = 0.0;
        if (e.getStatus() == PipelineStatus.COMPLETED) {
            progress = 100.0;
        } else if (e.getStatus() == PipelineStatus.RUNNING || e.getStatus() == PipelineStatus.PAUSED) {
            String statsKey = "pipeline:" + e.getId() + ":stats";
            String val = (String) redisTemplate.opsForHash().get(statsKey, "overallProgress");
            if (val != null) {
                try { progress = Double.parseDouble(val); } catch (NumberFormatException ignored) {}
            }
        }

        return PipelineSummaryResponse.builder()
                .id(e.getId()).name(e.getName()).status(e.getStatus())
                .sourceConnectionId(e.getSourceConnectionId())
                .targetConnectionId(e.getTargetConnectionId())
                .progress(progress)
                .validationErrors(mappingService.parseValidationErrors(e.getValidationErrors()))
                .tableCount(e.getPipelineTables().size()).createdAt(e.getCreatedAt())
                .namespaceId(e.getNamespace() != null ? e.getNamespace().getId() : null)
                .namespaceName(e.getNamespace() != null ? e.getNamespace().getName() : null)
                .ownerName(createdBy != null ? createdBy.getFullName() : "Unknown")
                .ownerColor(createdBy != null ? createdBy.getAvatarColor() : "#000000")
                .build();
    }

    // =========================================================================
    // EXPORT & IMPORT & ROLLBACK
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public PipelineExportDto exportPipeline(String id) {
        Pipeline pipeline = findEntity(id);

        if (pipeline.getStatus() != PipelineStatus.VALIDATED) {
            throw new DatashifterException("Export is only permitted when the pipeline is in VALIDATED state. Current status: " + pipeline.getStatus());
        }

        Connection sourceConn = connectionRepository.findById(pipeline.getSourceConnectionId()).orElse(null);
        Connection targetConn = connectionRepository.findById(pipeline.getTargetConnectionId()).orElse(null);

        String sourceConnName = sourceConn != null ? sourceConn.getName() : "Unknown";
        String targetConnName = targetConn != null ? targetConn.getName() : "Unknown";

        List<ConnectionConfigDto> connectionDtos = new java.util.ArrayList<>();
        if (sourceConn != null) {
            connectionDtos.add(ConnectionConfigDto.builder()
                    .name(sourceConn.getName())
                    .dbType(sourceConn.getDbType())
                    .dbVersion(sourceConn.getDbVersion())
                    .host(sourceConn.getHost())
                    .port(sourceConn.getPort())
                    .databaseName(sourceConn.getDatabaseName())
                    .schemaName(sourceConn.getSchemaName())
                    .username(sourceConn.getUsername())
                    .extraProperties(sourceConn.getExtraProperties())
                    .build());
        }
        if (targetConn != null && !targetConn.getName().equals(sourceConnName)) {
            connectionDtos.add(ConnectionConfigDto.builder()
                    .name(targetConn.getName())
                    .dbType(targetConn.getDbType())
                    .dbVersion(targetConn.getDbVersion())
                    .host(targetConn.getHost())
                    .port(targetConn.getPort())
                    .databaseName(targetConn.getDatabaseName())
                    .schemaName(targetConn.getSchemaName())
                    .username(targetConn.getUsername())
                    .extraProperties(targetConn.getExtraProperties())
                    .build());
        }

        List<PipelineTableConfigDto> tableDtos = pipeline.getPipelineTables().stream()
                .sorted(Comparator.comparing(PipelineTable::getExecutionOrder))
                .map(pt -> PipelineTableConfigDto.builder()
                        .sourceTable(pt.getSourceTable())
                        .executionOrder(pt.getExecutionOrder())
                        .mappingType(pt.getMappingType())
                        .targetMappings(pt.getTargetTableMappings().stream()
                                .map(ttm -> TargetTableMappingConfigDto.builder()
                                        .targetTable(ttm.getTargetTable())
                                        .writeMode(ttm.getWriteMode())
                                        .columnMappings(ttm.getColumnMappings().stream()
                                                .sorted(Comparator.comparing(ColumnMapping::getMappingOrder))
                                                .map(cm -> ColumnMappingConfigDto.builder()
                                                        .sourceColumn(cm.getSourceColumn())
                                                        .sourceType(cm.getSourceType())
                                                        .targetColumn(cm.getTargetColumn())
                                                        .targetType(cm.getTargetType())
                                                        .mappingOrder(cm.getMappingOrder())
                                                        .defaultValue(cm.getDefaultValue())
                                                        .transformations(cm.getTransformations().stream()
                                                                .sorted(Comparator.comparing(Transformation::getExecutionOrder))
                                                                .map(tr -> TransformationConfigDto.builder()
                                                                        .functionName(tr.getFunctionName())
                                                                        .arguments(tr.getArguments())
                                                                        .executionOrder(tr.getExecutionOrder())
                                                                        .build())
                                                                .toList())
                                                        .build())
                                                .toList())
                                        .build())
                                .toList())
                        .filters(pt.getFilters().stream()
                                .sorted(Comparator.comparing(Filter::getFilterOrder))
                                .map(f -> FilterConfigDto.builder()
                                        .columnName(f.getColumnName())
                                        .operator(f.getOperator())
                                        .value(f.getValue())
                                        .logicalOperator(f.getLogicalOperator())
                                        .filterOrder(f.getFilterOrder())
                                        .build())
                                .toList())
                        .build())
                .toList();

        PipelineConfigDto pipelineDto = PipelineConfigDto.builder()
                .name(pipeline.getName())
                .description(pipeline.getDescription())
                .sourceConnectionName(sourceConnName)
                .targetConnectionName(targetConnName)
                .chunkSize(pipeline.getChunkSize())
                .defaultWriteMode(pipeline.getDefaultWriteMode())
                .ignoreExceptions(pipeline.getIgnoreExceptions())
                .maxErrorThreshold(pipeline.getMaxErrorThreshold())
                .logSourceRow(pipeline.getLogSourceRow())
                .sourcePoolSize(pipeline.getSourcePoolSize())
                .targetPoolSize(pipeline.getTargetPoolSize())
                .previewInflightRecords(pipeline.getPreviewInflightRecords())
                .tables(tableDtos)
                .build();

        return PipelineExportDto.builder()
                .version(1)
                .pipeline(pipelineDto)
                .connections(connectionDtos)
                .build();
    }

    @Override
    @Transactional
    public PipelineImportResultDto importPipeline(PipelineExportDto exportDto) {
        List<String> errors = new java.util.ArrayList<>();
        List<String> warnings = new java.util.ArrayList<>();
        List<String> createdConnectionNames = new java.util.ArrayList<>();
        List<String> existingConnectionNames = new java.util.ArrayList<>();
        List<String> createdConnectionIds = new java.util.ArrayList<>();

        // 1. Validation
        if (exportDto == null) {
            errors.add("Import file content cannot be empty.");
            return PipelineImportResultDto.builder().success(false).errors(errors).build();
        }

        PipelineConfigDto pipeConfig = exportDto.getPipeline();
        if (pipeConfig == null) {
            errors.add("Missing 'pipeline' section in JSON configuration.");
            return PipelineImportResultDto.builder().success(false).errors(errors).build();
        }

        if (pipeConfig.getName() == null || pipeConfig.getName().trim().isEmpty()) {
            errors.add("Pipeline 'name' is required.");
        }
        if (pipeConfig.getSourceConnectionName() == null || pipeConfig.getSourceConnectionName().trim().isEmpty()) {
            errors.add("Pipeline 'sourceConnectionName' is required.");
        }
        if (pipeConfig.getTargetConnectionName() == null || pipeConfig.getTargetConnectionName().trim().isEmpty()) {
            errors.add("Pipeline 'targetConnectionName' is required.");
        }

        String orgId = UserContext.getCurrentOrgId();
        if (pipeConfig.getName() != null && repository.findByNameAndOrgId(pipeConfig.getName().trim(), orgId).isPresent()) {
            errors.add("Pipeline with name '" + pipeConfig.getName().trim() + "' already exists.");
        }

        if (!errors.isEmpty()) {
            return PipelineImportResultDto.builder()
                    .success(false)
                    .errors(errors)
                    .warnings(warnings)
                    .build();
        }

        // Check subscription limit for pipelines
        long currentPipeCount = repository.findByOrgId(orgId).size();
        limitChecker.assertCanCreatePipeline(orgId, currentPipeCount);

        String userId = UserContext.getCurrentUserId();
        AppUser currentUser = entityManager.getReference(AppUser.class, userId);

        // 2. Resolve Connections
        Map<String, Connection> connectionMap = new java.util.HashMap<>();
        List<ConnectionConfigDto> connConfigs = exportDto.getConnections() != null ? exportDto.getConnections() : List.of();

        for (ConnectionConfigDto connDto : connConfigs) {
            if (connDto.getName() == null || connDto.getName().trim().isEmpty()) continue;
            String cName = connDto.getName().trim();

            var existingConnOpt = connectionRepository.findByNameAndOrgId(cName, orgId);
            if (existingConnOpt.isPresent()) {
                connectionMap.put(cName, existingConnOpt.get());
                existingConnectionNames.add(cName);
                warnings.add("Connection '" + cName + "' already exists. Skipped creating duplicate.");
            } else {
                // Assert connection limit
                long currentConnCount = connectionRepository.findByOrgId(orgId).size();
                limitChecker.assertCanCreateConnection(orgId, currentConnCount);

                Connection newConn = Connection.builder()
                        .name(cName)
                        .createdBy(currentUser)
                        .dbType(connDto.getDbType())
                        .dbVersion(connDto.getDbVersion())
                        .host(connDto.getHost() != null ? connDto.getHost() : "localhost")
                        .port(connDto.getPort())
                        .databaseName(connDto.getDatabaseName())
                        .schemaName(connDto.getSchemaName())
                        .username(connDto.getUsername() != null ? connDto.getUsername() : "user")
                        .encryptedPassword(com.datashifter.common.utils.EncryptionUtil.encrypt(""))
                        .extraProperties(connDto.getExtraProperties())
                        .status(com.datashifter.common.enums.ConnectionStatus.TESTING)
                        .build();

                newConn = connectionRepository.save(newConn);
                connectionMap.put(cName, newConn);
                createdConnectionNames.add(cName);
                createdConnectionIds.add(newConn.getId());
                warnings.add("Connection '" + cName + "' was created with an empty password. Please update its password in Connections.");
            }
        }

        // Verify source and target connections are resolved
        String srcName = pipeConfig.getSourceConnectionName().trim();
        String tgtName = pipeConfig.getTargetConnectionName().trim();

        Connection srcConn = connectionMap.get(srcName);
        if (srcConn == null) {
            var existing = connectionRepository.findByNameAndOrgId(srcName, orgId);
            if (existing.isPresent()) {
                srcConn = existing.get();
                connectionMap.put(srcName, srcConn);
                existingConnectionNames.add(srcName);
            } else {
                errors.add("Source connection '" + srcName + "' not found and not provided in connections list.");
            }
        }

        Connection tgtConn = connectionMap.get(tgtName);
        if (tgtConn == null) {
            var existing = connectionRepository.findByNameAndOrgId(tgtName, orgId);
            if (existing.isPresent()) {
                tgtConn = existing.get();
                connectionMap.put(tgtName, tgtConn);
                existingConnectionNames.add(tgtName);
            } else {
                errors.add("Target connection '" + tgtName + "' not found and not provided in connections list.");
            }
        }

        if (!errors.isEmpty()) {
            return PipelineImportResultDto.builder()
                    .success(false)
                    .errors(errors)
                    .warnings(warnings)
                    .createdConnectionIds(createdConnectionIds)
                    .createdConnectionNames(createdConnectionNames)
                    .existingConnectionNames(existingConnectionNames)
                    .build();
        }

        // 3. Build Pipeline Entity
        Pipeline pipeline = Pipeline.builder()
                .name(pipeConfig.getName().trim())
                .description(pipeConfig.getDescription())
                .createdBy(currentUser)
                .sourceConnectionId(srcConn.getId())
                .targetConnectionId(tgtConn.getId())
                .chunkSize(pipeConfig.getChunkSize() != null ? pipeConfig.getChunkSize() : 10000)
                .defaultWriteMode(pipeConfig.getDefaultWriteMode() != null ? pipeConfig.getDefaultWriteMode() : WriteMode.UPSERT)
                .ignoreExceptions(pipeConfig.getIgnoreExceptions() != null ? pipeConfig.getIgnoreExceptions() : false)
                .maxErrorThreshold(pipeConfig.getMaxErrorThreshold() != null ? pipeConfig.getMaxErrorThreshold() : 1000)
                .logSourceRow(pipeConfig.getLogSourceRow() != null ? pipeConfig.getLogSourceRow() : true)
                .sourcePoolSize(pipeConfig.getSourcePoolSize() != null ? pipeConfig.getSourcePoolSize() : 5)
                .targetPoolSize(pipeConfig.getTargetPoolSize() != null ? pipeConfig.getTargetPoolSize() : 10)
                .previewInflightRecords(pipeConfig.getPreviewInflightRecords() != null ? pipeConfig.getPreviewInflightRecords() : true)
                .status(PipelineStatus.NOT_VALIDATED)
                .build();

        int tableCount = 0;
        int columnMappingsCount = 0;
        int transformationsCount = 0;

        if (pipeConfig.getTables() != null) {
            for (PipelineTableConfigDto tDto : pipeConfig.getTables()) {
                PipelineTable pt = PipelineTable.builder()
                        .pipeline(pipeline)
                        .sourceTable(tDto.getSourceTable())
                        .executionOrder(tDto.getExecutionOrder() != null ? tDto.getExecutionOrder() : tableCount)
                        .mappingType(tDto.getMappingType() != null ? tDto.getMappingType() : TableMappingType.ONE_TO_ONE)
                        .build();
                tableCount++;

                if (tDto.getTargetMappings() != null) {
                    for (TargetTableMappingConfigDto ttmDto : tDto.getTargetMappings()) {
                        TargetTableMapping ttm = TargetTableMapping.builder()
                                .pipelineTable(pt)
                                .targetTable(ttmDto.getTargetTable())
                                .writeMode(ttmDto.getWriteMode() != null ? ttmDto.getWriteMode() : pipeline.getDefaultWriteMode())
                                .build();

                        if (ttmDto.getColumnMappings() != null) {
                            for (ColumnMappingConfigDto cmDto : ttmDto.getColumnMappings()) {
                                ColumnMapping cm = ColumnMapping.builder()
                                        .targetTableMapping(ttm)
                                        .sourceColumn(cmDto.getSourceColumn())
                                        .sourceType(cmDto.getSourceType())
                                        .targetColumn(cmDto.getTargetColumn())
                                        .targetType(cmDto.getTargetType())
                                        .mappingOrder(cmDto.getMappingOrder() != null ? cmDto.getMappingOrder() : 0)
                                        .defaultValue(cmDto.getDefaultValue())
                                        .build();
                                columnMappingsCount++;

                                if (cmDto.getTransformations() != null) {
                                    for (TransformationConfigDto trDto : cmDto.getTransformations()) {
                                        cm.getTransformations().add(Transformation.builder()
                                                .columnMapping(cm)
                                                .functionName(trDto.getFunctionName())
                                                .arguments(trDto.getArguments())
                                                .executionOrder(trDto.getExecutionOrder() != null ? trDto.getExecutionOrder() : 0)
                                                .build());
                                        transformationsCount++;
                                    }
                                }
                                ttm.getColumnMappings().add(cm);
                            }
                        }
                        pt.getTargetTableMappings().add(ttm);
                    }
                }

                if (tDto.getFilters() != null) {
                    for (FilterConfigDto fDto : tDto.getFilters()) {
                        pt.getFilters().add(Filter.builder()
                                .pipelineTable(pt)
                                .columnName(fDto.getColumnName())
                                .operator(fDto.getOperator())
                                .value(fDto.getValue())
                                .logicalOperator(fDto.getLogicalOperator() != null ? fDto.getLogicalOperator() : LogicalOperator.AND)
                                .filterOrder(fDto.getFilterOrder() != null ? fDto.getFilterOrder() : 0)
                                .build());
                    }
                }

                pipeline.getPipelineTables().add(pt);
            }
        }

        pipeline = repository.save(pipeline);
        log.info("Imported pipeline '{}' (ID: {}) with {} tables, {} mappings, {} transformations",
                pipeline.getName(), pipeline.getId(), tableCount, columnMappingsCount, transformationsCount);

        return PipelineImportResultDto.builder()
                .success(true)
                .pipelineId(pipeline.getId())
                .pipelineName(pipeline.getName())
                .createdConnectionNames(createdConnectionNames)
                .existingConnectionNames(existingConnectionNames)
                .createdConnectionIds(createdConnectionIds)
                .tablesCount(tableCount)
                .columnMappingsCount(columnMappingsCount)
                .transformationsCount(transformationsCount)
                .warnings(warnings)
                .errors(List.of())
                .build();
    }

    @Override
    @Transactional
    public PipelineRollbackResultDto rollbackImport(PipelineRollbackRequest rollbackRequest) {
        if (rollbackRequest == null) {
            throw new DatashifterException("Rollback request cannot be null.");
        }

        String orgId = UserContext.getCurrentOrgId();
        String deletedPipelineId = null;
        List<String> deletedConnectionIds = new java.util.ArrayList<>();

        // 1. Delete pipeline if present
        if (rollbackRequest.getPipelineId() != null && !rollbackRequest.getPipelineId().isBlank()) {
            var pipelineOpt = repository.findById(rollbackRequest.getPipelineId());
            if (pipelineOpt.isPresent()) {
                Pipeline p = pipelineOpt.get();
                if (p.getCreatedBy() != null && p.getCreatedBy().getOrganization() != null
                        && orgId.equals(p.getCreatedBy().getOrganization().getId())) {
                    repository.delete(p);
                    deletedPipelineId = rollbackRequest.getPipelineId();
                    log.info("Rolled back pipeline: {}", deletedPipelineId);
                }
            }
        }

        // 2. Delete newly created connections if provided
        if (rollbackRequest.getCreatedConnectionIds() != null) {
            for (String connId : rollbackRequest.getCreatedConnectionIds()) {
                var connOpt = connectionRepository.findById(connId);
                if (connOpt.isPresent()) {
                    Connection c = connOpt.get();
                    if (c.getCreatedBy() != null && c.getCreatedBy().getOrganization() != null
                            && orgId.equals(c.getCreatedBy().getOrganization().getId())) {
                        connectionRepository.delete(c);
                        deletedConnectionIds.add(connId);
                        log.info("Rolled back connection: {}", connId);
                    }
                }
            }
        }

        return PipelineRollbackResultDto.builder()
                .success(true)
                .message("Successfully rolled back imported entities")
                .deletedPipelineId(deletedPipelineId)
                .deletedConnectionIds(deletedConnectionIds)
                .build();
    }
}