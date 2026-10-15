package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.enums.PipelineMode;
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
import com.datashifter.common.repositories.CommonWorkflowNodeRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.interfaces.PipelineService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import com.datashifter.pipeline.statemachine.PipelineStateMachine;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
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
    private final CommonWorkflowNodeRepository workflowNodeRepository;
    private final WorkflowService workflowService;

    // =========================================================================
    // CREATE — builds PipelineTable + TargetTableMapping entries
    // =========================================================================

    @Override
    @Transactional
    @Tool(description = "Create a new data migration pipeline with sourceConnectionId, targetConnectionId, chunkSize, defaultWriteMode (INSERT, UPSERT, REPLACE, INSERT_IGNORE), and initial source→target table pairs.")
    public PipelineResponse create(
            @ToolParam(description = "Pipeline creation parameters including name, description, namespaceId, sourceConnectionId, targetConnectionId, chunkSize, defaultWriteMode, and tables") CreatePipelineRequest req) {
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
                .sourceAdapterId(req.getSourceAdapterId())
                .targetAdapterId(req.getTargetAdapterId())
                .sourceConfig(req.getSourceConfig())
                .targetConfig(req.getTargetConfig())
                .chunkSize(req.getChunkSize() != null ? req.getChunkSize() : 10000)
                .defaultWriteMode(req.getDefaultWriteMode() != null ? req.getDefaultWriteMode() : WriteMode.UPSERT)
                .ignoreExceptions(req.getIgnoreExceptions() != null ? req.getIgnoreExceptions() : false)
                .maxErrorThreshold(req.getMaxErrorThreshold() != null ? req.getMaxErrorThreshold() : 1000)
                .logSourceRow(req.getLogSourceRow() != null ? req.getLogSourceRow() : true)
                .pipelineMode(req.getPipelineMode() != null ? req.getPipelineMode() : PipelineMode.BATCH)
                .cdcDirectoryPath(req.getCdcDirectoryPath())
                .cdcFilePattern(req.getCdcFilePattern())
                .cdcStartingScn(req.getCdcStartingScn())
                .cdcLogType(req.getCdcLogType() != null ? req.getCdcLogType() : "ORACLE_TRAIL")
                .cdcFlushIntervalMs(req.getCdcFlushIntervalMs() != null ? req.getCdcFlushIntervalMs() : 200)
                .cdcBatchSize(req.getCdcBatchSize() != null ? req.getCdcBatchSize() : 500)
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
    @Tool(description = "Update an existing pipeline's settings (name, description, chunkSize, defaultWriteMode, ignoreExceptions, maxErrorThreshold, logSourceRow, sourcePoolSize, targetPoolSize, tableWriteModeOverrides) by pipeline ID.")
    public PipelineResponse update(
            @ToolParam(description = "The unique ID of the pipeline to update") String id,
            @ToolParam(description = "Updated pipeline settings") UpdatePipelineRequest req) {
        Pipeline entity = findEntity(id);

        if (entity.getStatus() == PipelineStatus.RUNNING) {
            throw new DatashifterException("Cannot update settings while the pipeline is running. Pause the pipeline first.");
        }

        if (req.getName() != null) entity.setName(req.getName());
        if (req.getDescription() != null) entity.setDescription(req.getDescription());
        if (req.getSourceAdapterId() != null) entity.setSourceAdapterId(req.getSourceAdapterId());
        if (req.getTargetAdapterId() != null) entity.setTargetAdapterId(req.getTargetAdapterId());
        if (req.getSourceConfig() != null) entity.setSourceConfig(req.getSourceConfig());
        if (req.getTargetConfig() != null) entity.setTargetConfig(req.getTargetConfig());
        if (req.getChunkSize() != null) entity.setChunkSize(req.getChunkSize());
        if (req.getDefaultWriteMode() != null) entity.setDefaultWriteMode(req.getDefaultWriteMode());
        if (req.getIgnoreExceptions() != null) entity.setIgnoreExceptions(req.getIgnoreExceptions());
        if (req.getMaxErrorThreshold() != null) entity.setMaxErrorThreshold(req.getMaxErrorThreshold());
        if (req.getLogSourceRow() != null) entity.setLogSourceRow(req.getLogSourceRow());
        if (req.getSourcePoolSize() != null) entity.setSourcePoolSize(req.getSourcePoolSize());
        if (req.getTargetPoolSize() != null) entity.setTargetPoolSize(req.getTargetPoolSize());
        if (req.getPreviewInflightRecords() != null) entity.setPreviewInflightRecords(req.getPreviewInflightRecords());
        if (req.getPipelineMode() != null) entity.setPipelineMode(req.getPipelineMode());
        if (req.getCdcDirectoryPath() != null) entity.setCdcDirectoryPath(req.getCdcDirectoryPath());
        if (req.getCdcFilePattern() != null) entity.setCdcFilePattern(req.getCdcFilePattern());
        if (req.getCdcStartingScn() != null) entity.setCdcStartingScn(req.getCdcStartingScn());
        if (req.getCdcLogType() != null) entity.setCdcLogType(req.getCdcLogType());
        if (req.getCdcFlushIntervalMs() != null) entity.setCdcFlushIntervalMs(req.getCdcFlushIntervalMs());
        if (req.getCdcBatchSize() != null) entity.setCdcBatchSize(req.getCdcBatchSize());

        // Per-table write mode overrides
        if (req.getTableWriteModeOverrides() != null && !req.getTableWriteModeOverrides().isEmpty()) {
            boolean writeModeChanged = false;
            for (var override : req.getTableWriteModeOverrides()) {
                var ttmOpt = entity.getPipelineTables().stream()
                        .flatMap(pt -> pt.getTargetTableMappings().stream())
                        .filter(ttm -> ttm.getId().equals(override.getTargetTableMappingId()))
                        .findFirst();
                if (ttmOpt.isPresent()) {
                    TargetTableMapping ttm = ttmOpt.get();
                    if (override.getWriteMode() != null && override.getWriteMode() != ttm.getWriteMode()) {
                        ttm.setWriteMode(override.getWriteMode());
                        writeModeChanged = true;
                    }
                }
            }
            if (writeModeChanged) {
                entity.setStatus(PipelineStatus.NOT_VALIDATED);
                entity.setValidationErrors(null);
            }
        }

        Pipeline saved = repository.save(entity);
        workflowService.syncWorkflowStatusForPipeline(saved.getId());
        return toFullResponse(saved);
    }

    // =========================================================================
    // TABLE PAIR MANAGEMENT
    // =========================================================================

    @Override
    @Transactional
    @Tool(description = "Add a new sourceTable → targetTable mapping pair to an existing pipeline.")
    public PipelineResponse addTablePair(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId,
            @ToolParam(description = "Request containing sourceTable and targetTable names") AddTablePairRequest request) {
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
        Pipeline saved = repository.save(pipeline);
        workflowService.syncWorkflowStatusForPipeline(saved.getId());
        return toFullResponse(saved);
    }

    @Override
    @Transactional
    @Tool(description = "Remove a source→target table pair from a pipeline by pipelineId and pipelineTableId.")
    public PipelineResponse removeTablePair(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId,
            @ToolParam(description = "The unique ID of the pipelineTable entry to remove") String pipelineTableId) {
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
        Pipeline saved = repository.save(pipeline);
        workflowService.syncWorkflowStatusForPipeline(saved.getId());
        return toFullResponse(saved);
    }

    // =========================================================================
    // GET
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get full details of a pipeline by ID, including source/target connection IDs, status, settings, table mappings, column mappings, transformations, filters, and validation errors.")
    public PipelineResponse getById(
            @ToolParam(description = "The unique ID of the pipeline") String id) {
        return toFullResponse(findEntity(id));
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "List all pipelines in the current organization with their summary status, source/target connection IDs, progress, validation errors, and table counts.")
    public List<PipelineSummaryResponse> getAll() {
        String orgId = UserContext.getCurrentOrgId();
        return repository.findByOrgId(orgId).stream().map(this::toSummary).collect(Collectors.toList());
    }

    // =========================================================================
    // DELETE
    // =========================================================================

    @Override
    @Transactional
    @Tool(description = "Delete a pipeline by ID if it is not currently running and not linked to a workflow.")
    public void delete(
            @ToolParam(description = "The unique ID of the pipeline to delete") String id) {
        Pipeline entity = findEntity(id);
        if (entity.getStatus() == PipelineStatus.RUNNING) {
            throw new DatashifterException("Cannot delete a running pipeline. Pause or stop it first.");
        }
        workflowNodeRepository.findByPipelineIdWithWorkflow(id).ifPresent(node -> {
            throw new DatashifterException("Cannot delete pipeline because it is linked to workflow '"
                    + node.getWorkflow().getName() + "'. Remove it from the workflow first.");
        });
        repository.deleteById(id);
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    @Override
    @Transactional
    @Tool(description = "Perform an execution or lifecycle action on a pipeline (VALIDATE, START, PAUSE, RESUME, STOP) and return the updated pipeline state and any validation errors.")
    public PipelineResponse performAction(
            @ToolParam(description = "The unique ID of the pipeline") String id,
            @ToolParam(description = "The action request containing action (VALIDATE, START, PAUSE, RESUME, STOP)") PipelineActionRequest action) {
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
                workflowNodeRepository.findByPipelineIdWithWorkflow(id).ifPresent(node -> {
                    throw new DatashifterException("Pipeline is locked to workflow '"
                            + node.getWorkflow().getName() + "' and cannot be executed independently. Run the workflow instead.");
                });
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

                // When starting or re-running from scratch (START), remove existing chunk_cursors, error_logs, and checkpoints
                if (action.getAction() == PipelineAction.START) {
                    int deletedCursors = entityManager.createQuery("DELETE FROM ChunkCursor c WHERE c.pipelineId = :pipelineId")
                            .setParameter("pipelineId", id)
                            .executeUpdate();
                    entityManager.createQuery("DELETE FROM ErrorLog e WHERE e.pipelineId = :pipelineId")
                            .setParameter("pipelineId", id)
                            .executeUpdate();
                    var checkpointKeys = redisTemplate.keys("pipeline:" + id + ":table:*:checkpoint");
                    if (checkpointKeys != null && !checkpointKeys.isEmpty()) {
                        redisTemplate.delete(checkpointKeys);
                    }
                    redisTemplate.delete("pipeline:" + id + ":stats");
                    log.info("Cleared {} chunk_cursors, error_logs, and Redis checkpoints for pipeline {} on START", deletedCursors, id);
                } else {
                    entityManager.createQuery("DELETE FROM ErrorLog e WHERE e.pipelineId = :pipelineId")
                            .setParameter("pipelineId", id)
                            .executeUpdate();
                    if (redisTemplate.opsForHash() != null) {
                        redisTemplate.opsForHash().put("pipeline:" + id + ":stats", "errorsSkipped", "0");
                    }
                }

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
                workflowNodeRepository.findByPipelineIdWithWorkflow(id).ifPresent(node -> {
                    throw new DatashifterException("Pipeline is locked to workflow '"
                            + node.getWorkflow().getName() + "' and cannot be controlled independently. Pause the workflow instead.");
                });
                PipelineStateMachine.validateTransition(entity.getStatus(), PipelineStatus.PAUSED);
                entity.setStatus(PipelineStatus.PAUSED);  // Update DB immediately
                repository.save(entity);
                kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                        PipelineCommandEvent.builder()
                                .pipelineId(id).command("PAUSE").timestamp(Instant.now()).build());
                break;

            case STOP:
                UserContext.assertPermission(Permissions.PIPELINE_STOP);
                workflowNodeRepository.findByPipelineIdWithWorkflow(id).ifPresent(node -> {
                    throw new DatashifterException("Pipeline is locked to workflow '"
                            + node.getWorkflow().getName() + "' and cannot be controlled independently. Stop the workflow instead.");
                });
                entity.setStatus(PipelineStatus.ERRORED);  // Update DB immediately
                repository.save(entity);
                kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                        PipelineCommandEvent.builder()
                                .pipelineId(id).command("STOP").timestamp(Instant.now()).build());
                break;
        }

        Pipeline saved = repository.save(entity);
        workflowService.syncWorkflowStatusForPipeline(saved.getId());
        return toFullResponse(saved);
    }

    // =========================================================================
    // UPDATE MAPPINGS
    // =========================================================================

    @Override
    @Transactional
    @Tool(description = "Update all table pairs, column mappings, transformations (e.g., TRIM, UPPER, LOWER, CONCAT, REPLACE, TYPE_CAST, COALESCE, UDF), and row filters for a pipeline.")
    public PipelineResponse updateMappings(
            @ToolParam(description = "The unique ID of the pipeline") String pipelineId,
            @ToolParam(description = "Full list of source→target table mapping definitions including columnMappings, transformations, and filters") List<PipelineTableRequest> tables) {
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
                                                .arguments(sanitizeTransformationArguments(trReq.getFunctionName(), trReq.getArguments()))
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

        Pipeline saved = repository.save(entity);
        workflowService.syncWorkflowStatusForPipeline(saved.getId());
        return toFullResponse(saved);
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

        var nodeOpt = workflowNodeRepository.findByPipelineIdWithWorkflow(e.getId());
        String workflowId = nodeOpt.map(n -> n.getWorkflow().getId()).orElse(null);
        String workflowName = nodeOpt.map(n -> n.getWorkflow().getName()).orElse(null);

        return PipelineResponse.builder()
                .id(e.getId()).name(e.getName()).description(e.getDescription())
                .sourceConnectionId(e.getSourceConnectionId()).targetConnectionId(e.getTargetConnectionId())
                .sourceAdapterId(e.getSourceAdapterId()).targetAdapterId(e.getTargetAdapterId())
                .sourceConfig(e.getSourceConfig()).targetConfig(e.getTargetConfig())
                .status(e.getStatus()).chunkSize(e.getChunkSize()).defaultWriteMode(e.getDefaultWriteMode())
                .ignoreExceptions(e.getIgnoreExceptions()).maxErrorThreshold(e.getMaxErrorThreshold())
                .logSourceRow(e.getLogSourceRow())
                .sourcePoolSize(e.getSourcePoolSize()).targetPoolSize(e.getTargetPoolSize())
                .previewInflightRecords(e.getPreviewInflightRecords())
                .pipelineMode(e.getPipelineMode())
                .cdcDirectoryPath(e.getCdcDirectoryPath())
                .cdcFilePattern(e.getCdcFilePattern())
                .cdcStartingScn(e.getCdcStartingScn())
                .cdcLogType(e.getCdcLogType())
                .cdcFlushIntervalMs(e.getCdcFlushIntervalMs())
                .cdcBatchSize(e.getCdcBatchSize())
                .tables(tableResponses)
                .validationErrors(mappingService.parseValidationErrors(e.getValidationErrors()))
                .workflowId(workflowId)
                .workflowName(workflowName)
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

        var nodeOpt = workflowNodeRepository.findByPipelineIdWithWorkflow(e.getId());
        String workflowId = nodeOpt.map(n -> n.getWorkflow().getId()).orElse(null);
        String workflowName = nodeOpt.map(n -> n.getWorkflow().getName()).orElse(null);

        return PipelineSummaryResponse.builder()
                .id(e.getId()).name(e.getName()).status(e.getStatus())
                .sourceConnectionId(e.getSourceConnectionId())
                .targetConnectionId(e.getTargetConnectionId())
                .sourceAdapterId(e.getSourceAdapterId())
                .targetAdapterId(e.getTargetAdapterId())
                .pipelineMode(e.getPipelineMode())
                .progress(progress)
                .validationErrors(mappingService.parseValidationErrors(e.getValidationErrors()))
                .tableCount(e.getPipelineTables().size()).createdAt(e.getCreatedAt())
                .namespaceId(e.getNamespace() != null ? e.getNamespace().getId() : null)
                .namespaceName(e.getNamespace() != null ? e.getNamespace().getName() : null)
                .ownerName(createdBy != null ? createdBy.getFullName() : "Unknown")
                .ownerColor(createdBy != null ? createdBy.getAvatarColor() : "#000000")
                .workflowId(workflowId)
                .workflowName(workflowName)
                .build();
    }

    // =========================================================================
    // EXPORT & IMPORT & ROLLBACK
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Export a validated or completed pipeline configuration as a portable JSON DTO including connections, table pairs, column mappings, transformations, and filters.")
    public PipelineExportDto exportPipeline(
            @ToolParam(description = "The unique ID of the pipeline to export") String id) {
        Pipeline pipeline = findEntity(id);

        if (pipeline.getStatus() == PipelineStatus.DRAFT
                || pipeline.getStatus() == PipelineStatus.NOT_VALIDATED
                || pipeline.getStatus() == PipelineStatus.INVALID) {
            throw new DatashifterException("Export is not permitted when the pipeline is in " + pipeline.getStatus() + " state.");
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
                                                                        .arguments(formatExportArguments(tr))
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
                .sourceAdapterId(pipeline.getSourceAdapterId())
                .targetAdapterId(pipeline.getTargetAdapterId())
                .sourceConfig(pipeline.getSourceConfig())
                .targetConfig(pipeline.getTargetConfig())
                .chunkSize(pipeline.getChunkSize())
                .defaultWriteMode(pipeline.getDefaultWriteMode())
                .ignoreExceptions(pipeline.getIgnoreExceptions())
                .maxErrorThreshold(pipeline.getMaxErrorThreshold())
                .logSourceRow(pipeline.getLogSourceRow())
                .sourcePoolSize(pipeline.getSourcePoolSize())
                .targetPoolSize(pipeline.getTargetPoolSize())
                .previewInflightRecords(pipeline.getPreviewInflightRecords())
                .pipelineMode(pipeline.getPipelineMode())
                .cdcDirectoryPath(pipeline.getCdcDirectoryPath())
                .cdcFilePattern(pipeline.getCdcFilePattern())
                .cdcStartingScn(pipeline.getCdcStartingScn())
                .cdcLogType(pipeline.getCdcLogType())
                .cdcFlushIntervalMs(pipeline.getCdcFlushIntervalMs())
                .cdcBatchSize(pipeline.getCdcBatchSize())
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
    @Tool(description = "Import and create a complete pipeline (including tables, column mappings, transformations, filters, and referenced connections) from a PipelineExportDto structure.")
    public PipelineImportResultDto importPipeline(
            @ToolParam(description = "Complete pipeline export DTO containing pipeline config and connection configs") PipelineExportDto exportDto) {
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
                        .status(com.datashifter.common.enums.ConnectionStatus.CREATED)
                        .build();

                newConn = connectionRepository.save(newConn);
                connectionMap.put(cName, newConn);
                createdConnectionNames.add(cName);
                createdConnectionIds.add(newConn.getId());
                warnings.add("Connection '" + cName + "' was created with an empty password. Please update its password in Connections.");
            }
        }

        // Verify source and target connections are resolved
        Connection srcConn = null;
        if (pipeConfig.getSourceConnectionName() != null && !pipeConfig.getSourceConnectionName().isBlank()) {
            String srcName = pipeConfig.getSourceConnectionName().trim();
            srcConn = connectionMap.get(srcName);
            if (srcConn == null) {
                var existing = connectionRepository.findByNameAndOrgId(srcName, orgId);
                if (existing.isPresent()) {
                    srcConn = existing.get();
                    connectionMap.put(srcName, srcConn);
                    existingConnectionNames.add(srcName);
                } else if (pipeConfig.getSourceAdapterId() == null || pipeConfig.getSourceAdapterId().isBlank()) {
                    errors.add("Source connection '" + srcName + "' not found and not provided in connections list.");
                }
            }
        } else if (pipeConfig.getSourceAdapterId() == null || pipeConfig.getSourceAdapterId().isBlank()) {
            errors.add("Either sourceConnectionName or sourceAdapterId must be provided.");
        }

        Connection tgtConn = null;
        if (pipeConfig.getTargetConnectionName() != null && !pipeConfig.getTargetConnectionName().isBlank()) {
            String tgtName = pipeConfig.getTargetConnectionName().trim();
            tgtConn = connectionMap.get(tgtName);
            if (tgtConn == null) {
                var existing = connectionRepository.findByNameAndOrgId(tgtName, orgId);
                if (existing.isPresent()) {
                    tgtConn = existing.get();
                    connectionMap.put(tgtName, tgtConn);
                    existingConnectionNames.add(tgtName);
                } else if (pipeConfig.getTargetAdapterId() == null || pipeConfig.getTargetAdapterId().isBlank()) {
                    errors.add("Target connection '" + tgtName + "' not found and not provided in connections list.");
                }
            }
        } else if (pipeConfig.getTargetAdapterId() == null || pipeConfig.getTargetAdapterId().isBlank()) {
            errors.add("Either targetConnectionName or targetAdapterId must be provided.");
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
                .sourceConnectionId(srcConn != null ? srcConn.getId() : null)
                .targetConnectionId(tgtConn != null ? tgtConn.getId() : null)
                .sourceAdapterId(pipeConfig.getSourceAdapterId())
                .targetAdapterId(pipeConfig.getTargetAdapterId())
                .sourceConfig(pipeConfig.getSourceConfig())
                .targetConfig(pipeConfig.getTargetConfig())
                .chunkSize(pipeConfig.getChunkSize() != null ? pipeConfig.getChunkSize() : 10000)
                .defaultWriteMode(pipeConfig.getDefaultWriteMode() != null ? pipeConfig.getDefaultWriteMode() : WriteMode.UPSERT)
                .ignoreExceptions(pipeConfig.getIgnoreExceptions() != null ? pipeConfig.getIgnoreExceptions() : false)
                .maxErrorThreshold(pipeConfig.getMaxErrorThreshold() != null ? pipeConfig.getMaxErrorThreshold() : 1000)
                .logSourceRow(pipeConfig.getLogSourceRow() != null ? pipeConfig.getLogSourceRow() : true)
                .sourcePoolSize(pipeConfig.getSourcePoolSize() != null ? pipeConfig.getSourcePoolSize() : 5)
                .targetPoolSize(pipeConfig.getTargetPoolSize() != null ? pipeConfig.getTargetPoolSize() : 10)
                .previewInflightRecords(pipeConfig.getPreviewInflightRecords() != null ? pipeConfig.getPreviewInflightRecords() : true)
                .pipelineMode(pipeConfig.getPipelineMode() != null ? pipeConfig.getPipelineMode() : PipelineMode.BATCH)
                .cdcDirectoryPath(pipeConfig.getCdcDirectoryPath())
                .cdcFilePattern(pipeConfig.getCdcFilePattern())
                .cdcStartingScn(pipeConfig.getCdcStartingScn())
                .cdcLogType(pipeConfig.getCdcLogType() != null ? pipeConfig.getCdcLogType() : "ORACLE_TRAIL")
                .cdcFlushIntervalMs(pipeConfig.getCdcFlushIntervalMs() != null ? pipeConfig.getCdcFlushIntervalMs() : 200)
                .cdcBatchSize(pipeConfig.getCdcBatchSize() != null ? pipeConfig.getCdcBatchSize() : 500)
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
                                                .arguments(normalizeImportArguments(trDto))
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

    private static final ObjectMapper JSON_MAPPER = new ObjectMapper();

    private Object formatExportArguments(Transformation tr) {
        String rawArgs = tr.getArguments();
        if (rawArgs == null || rawArgs.isBlank()) {
            return rawArgs;
        }
        String trimmed = rawArgs.trim();
        if (tr.getFunctionName() == com.datashifter.common.enums.TransformFunction.UDF || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
            try {
                Map<String, Object> parsed = JSON_MAPPER.readValue(
                        trimmed, new com.fasterxml.jackson.core.type.TypeReference<java.util.LinkedHashMap<String, Object>>() {});
                parsed.remove("udfId");
                return parsed;
            } catch (Exception e) {
                log.warn("Failed to parse transformation arguments as JSON on export: {}", e.getMessage());
            }
        }
        return rawArgs;
    }

    private String normalizeImportArguments(TransformationConfigDto trDto) {
        Object rawArgs = trDto.getArguments();
        if (rawArgs == null) {
            return null;
        }
        if (rawArgs instanceof Map<?, ?> mapArgs) {
            Map<String, Object> cleaned = new java.util.LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : mapArgs.entrySet()) {
                String key = String.valueOf(entry.getKey());
                if (!"udfId".equals(key)) {
                    cleaned.put(key, entry.getValue());
                }
            }
            try {
                return JSON_MAPPER.writeValueAsString(cleaned);
            } catch (Exception e) {
                throw new DatashifterException("Invalid transformation arguments JSON: " + e.getMessage(), e);
            }
        }
        if (rawArgs instanceof String strArgs) {
            return sanitizeTransformationArguments(trDto.getFunctionName(), strArgs);
        }
        try {
            return JSON_MAPPER.writeValueAsString(rawArgs);
        } catch (Exception e) {
            return String.valueOf(rawArgs);
        }
    }

    private String sanitizeTransformationArguments(com.datashifter.common.enums.TransformFunction fn, String rawArgs) {
        if (rawArgs == null || rawArgs.isBlank()) {
            return rawArgs;
        }
        String trimmed = rawArgs.trim();
        if (fn == com.datashifter.common.enums.TransformFunction.UDF || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
            try {
                Map<String, Object> parsed = JSON_MAPPER.readValue(
                        trimmed, new com.fasterxml.jackson.core.type.TypeReference<java.util.LinkedHashMap<String, Object>>() {});
                parsed.remove("udfId");
                return JSON_MAPPER.writeValueAsString(parsed);
            } catch (Exception ignored) {
            }
        }
        return rawArgs;
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