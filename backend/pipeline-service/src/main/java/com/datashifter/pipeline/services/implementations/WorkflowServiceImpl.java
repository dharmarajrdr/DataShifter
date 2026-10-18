package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.dtos.PipelineDtos.PipelineSummaryResponse;
import com.datashifter.common.dtos.WorkflowDtos.*;
import com.datashifter.common.enums.*;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import com.datashifter.common.repositories.CommonWorkflowEdgeRepository;
import com.datashifter.common.repositories.CommonWorkflowNodeRepository;
import com.datashifter.common.repositories.CommonWorkflowRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.services.SubscriptionLimitChecker;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.pipeline.repositories.NamespaceRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowServiceImpl implements WorkflowService {

    private final CommonWorkflowRepository workflowRepository;
    private final CommonWorkflowNodeRepository nodeRepository;
    private final CommonWorkflowEdgeRepository edgeRepository;
    private final PipelineRepository pipelineRepository;
    private final NamespaceRepository namespaceRepository;
    private final ConnectionRepository connectionRepository;
    private final EntityManager entityManager;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final StringRedisTemplate redisTemplate;
    private final SubscriptionLimitChecker limitChecker;
    private final MappingService mappingService;
    private final ObjectMapper objectMapper;

    // =========================================================================
    // CREATE
    // =========================================================================

    @Override
    @Transactional
    @Tool(description = "Create a new DAG workflow orchestrating multiple pipelines with optional initial nodes and directed dependency edges.")
    public WorkflowResponse create(
            @ToolParam(description = "Workflow creation request with name, description, namespaceId, nodes, and edges") CreateWorkflowRequest req) {
        String orgId = UserContext.getCurrentOrgId();
        long currentCount = workflowRepository.countByOrgId(orgId);
        limitChecker.assertCanCreateWorkflow(orgId, currentCount);

        Namespace namespace = null;
        if (req.getNamespaceId() != null && !req.getNamespaceId().isBlank()) {
            namespace = namespaceRepository.findById(req.getNamespaceId()).orElse(null);
        }

        String userId = UserContext.getCurrentUserId();
        AppUser createdBy = entityManager.getReference(AppUser.class, userId);

        Workflow workflow = Workflow.builder()
                .orgId(orgId)
                .namespace(namespace)
                .name(req.getName().trim())
                .description(req.getDescription())
                .status(WorkflowStatus.DRAFT)
                .createdBy(createdBy)
                .build();

        workflow = workflowRepository.save(workflow);

        if ((req.getNodes() != null && !req.getNodes().isEmpty())
                || (req.getEdges() != null && !req.getEdges().isEmpty())) {
            applyCanvasState(workflow, req.getNodes(), req.getEdges());
        }

        return toFullResponse(workflow);
    }

    // =========================================================================
    // UPDATE & CANVAS SAVE
    // =========================================================================

    @Override
    @Transactional
    @Tool(description = "Update a workflow's name, description, namespaceId, or DAG nodes and edges by workflow ID.")
    public WorkflowResponse update(
            @ToolParam(description = "The unique ID of the workflow to update") String id,
            @ToolParam(description = "Updated workflow fields including name, description, namespaceId, nodes, and edges") UpdateWorkflowRequest req) {
        Workflow workflow = findEntity(id);
        assertNotRunningOrPaused(workflow, "Cannot update workflow while it is running or paused.");

        if (req.getName() != null && !req.getName().isBlank()) {
            workflow.setName(req.getName().trim());
        }
        if (req.getDescription() != null) {
            workflow.setDescription(req.getDescription());
        }
        if (req.getNamespaceId() != null) {
            if (req.getNamespaceId().isBlank()) {
                workflow.setNamespace(null);
            } else {
                workflow.setNamespace(namespaceRepository.findById(req.getNamespaceId()).orElse(null));
            }
        }

        if (req.getNodes() != null || req.getEdges() != null) {
            applyCanvasState(
                    workflow,
                    req.getNodes() != null ? req.getNodes() : List.of(),
                    req.getEdges() != null ? req.getEdges() : List.of()
            );
        } else {
            refreshDerivedStatus(workflow);
            workflow = workflowRepository.save(workflow);
        }

        return toFullResponse(workflow);
    }

    @Override
    @Transactional
    @Tool(description = "Save the DAG canvas layout (pipeline nodes and directed dependency edges) for a workflow and validate DAG topology.")
    public WorkflowResponse saveCanvas(
            @ToolParam(description = "The unique ID of the workflow") String id,
            @ToolParam(description = "Canvas state containing pipeline nodes (pipelineId, positionX, positionY) and directed edges (sourcePipelineId, targetPipelineId)") SaveWorkflowCanvasRequest req) {
        Workflow workflow = findEntity(id);
        assertNotRunningOrPaused(workflow, "Cannot modify workflow steps while the workflow is running or paused.");

        applyCanvasState(
                workflow,
                req.getNodes() != null ? req.getNodes() : List.of(),
                req.getEdges() != null ? req.getEdges() : List.of()
        );

        return toFullResponse(workflow);
    }

    @Override
    @Transactional
    @Tool(description = "Add one or more validated pipelines as nodes to an existing workflow.")
    public WorkflowResponse addPipelines(
            @ToolParam(description = "The unique ID of the workflow") String id,
            @ToolParam(description = "Request containing list of pipelineIds to add to the workflow") AddWorkflowPipelinesRequest req) {
        Workflow workflow = findEntity(id);
        assertNotRunningOrPaused(workflow, "Cannot add pipelines while the workflow is running or paused.");

        if (req.getPipelineIds() == null || req.getPipelineIds().isEmpty()) {
            return toFullResponse(workflow);
        }

        List<WorkflowNode> existingNodes = nodeRepository.findByWorkflow_Id(id);
        Set<String> existingIds = existingNodes.stream()
                .map(WorkflowNode::getPipelineId)
                .collect(Collectors.toSet());

        double baseY = existingNodes.stream()
                .mapToDouble(n -> n.getPositionY() != null ? n.getPositionY() : 60.0)
                .max()
                .orElse(-80.0) + 140.0;

        int index = 0;
        for (String pipelineId : req.getPipelineIds()) {
            if (existingIds.contains(pipelineId)) {
                continue;
            }
            validatePipelineEligibleForWorkflow(pipelineId, id);
            WorkflowNode node = WorkflowNode.builder()
                    .workflow(workflow)
                    .pipelineId(pipelineId)
                    .positionX(280.0)
                    .positionY(baseY + (index * 140.0))
                    .build();
            nodeRepository.save(node);
            existingIds.add(pipelineId);
            index++;
        }

        refreshDerivedStatus(workflow);
        workflow = workflowRepository.save(workflow);
        publishWorkflowStatus(workflow, nodeRepository.findByWorkflow_Id(id));
        return toFullResponse(workflow);
    }

    @Override
    @Transactional
    @Tool(description = "Remove a pipeline node and its connected edges from a workflow.")
    public WorkflowResponse removePipeline(
            @ToolParam(description = "The unique ID of the workflow") String id,
            @ToolParam(description = "The unique ID of the pipeline to remove from the workflow") String pipelineId) {
        Workflow workflow = findEntity(id);
        assertNotRunningOrPaused(workflow, "Cannot remove a pipeline while the workflow is running or paused.");

        List<WorkflowEdge> edges = edgeRepository.findByWorkflow_Id(id);
        for (WorkflowEdge edge : edges) {
            if (edge.getSourcePipelineId().equals(pipelineId)
                    || edge.getTargetPipelineId().equals(pipelineId)) {
                edgeRepository.delete(edge);
            }
        }
        edgeRepository.flush();

        nodeRepository.findByPipelineId(pipelineId).ifPresent(node -> {
            if (node.getWorkflow().getId().equals(id)) {
                nodeRepository.delete(node);
            }
        });
        nodeRepository.flush();

        refreshDerivedStatus(workflow);
        workflow = workflowRepository.save(workflow);
        publishWorkflowStatus(workflow, nodeRepository.findByWorkflow_Id(id));
        return toFullResponse(workflow);
    }

    // =========================================================================
    // GET & ELIGIBLE PIPELINES & DELETE
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "Get full details of a workflow by ID, including its status, DAG pipeline nodes, directed dependency edges, topological execution order, and any topology validation errors.")
    public WorkflowResponse getById(
            @ToolParam(description = "The unique ID of the workflow") String id) {
        return toFullResponse(findEntity(id));
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "List all workflows in the current organization with their summary status, pipeline count, progress, and namespace.")
    public List<WorkflowSummaryResponse> getAll() {
        String orgId = UserContext.getCurrentOrgId();
        return workflowRepository.findByOrgIdOrderByCreatedAtDesc(orgId)
                .stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    @Tool(description = "List all validated pipelines in the organization that are eligible to be added to a workflow (not locked to another workflow).")
    public List<PipelineSummaryResponse> getEligiblePipelines(
            @ToolParam(description = "Optional workflow ID when editing an existing workflow") String workflowId) {
        String orgId = UserContext.getCurrentOrgId();
        List<Pipeline> allPipelines = pipelineRepository.findByOrgId(orgId);

        return allPipelines.stream()
                .filter(p -> {
                    var nodeOpt = nodeRepository.findByPipelineIdWithWorkflow(p.getId());
                    if (nodeOpt.isPresent()) {
                        return workflowId != null && workflowId.equals(nodeOpt.get().getWorkflow().getId());
                    }
                    return p.getStatus() == PipelineStatus.VALIDATED;
                })
                .map(p -> {
                    AppUser createdBy = p.getCreatedBy();
                    return PipelineSummaryResponse.builder()
                            .id(p.getId())
                            .name(p.getName())
                            .status(p.getStatus())
                            .sourceConnectionId(p.getSourceConnectionId())
                            .targetConnectionId(p.getTargetConnectionId())
                            .tableCount(p.getPipelineTables().size())
                            .namespaceId(p.getNamespace() != null ? p.getNamespace().getId() : null)
                            .namespaceName(p.getNamespace() != null ? p.getNamespace().getName() : null)
                            .ownerName(createdBy != null ? createdBy.getFullName() : "Unknown")
                            .ownerColor(createdBy != null ? createdBy.getAvatarColor() : "#000000")
                            .createdAt(p.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @Tool(description = "Delete a workflow by ID if it is not currently running or paused.")
    public void delete(
            @ToolParam(description = "The unique ID of the workflow to delete") String id) {
        Workflow workflow = findEntity(id);
        assertNotRunningOrPaused(workflow, "Cannot delete a running or paused workflow. Stop it first.");
        edgeRepository.deleteByWorkflow_Id(id);
        nodeRepository.deleteByWorkflow_Id(id);
        workflowRepository.delete(workflow);
    }

    // =========================================================================
    // WORKFLOW EXECUTION ACTIONS (START, PAUSE, RESUME, STOP)
    // =========================================================================

    @Override
    @Transactional
    @Tool(description = "Execute a lifecycle action on a workflow (START, PAUSE, RESUME, STOP, RERUN_FAILED_STAGE, RERUN_FROM_CHECKPOINT).")
    public WorkflowResponse performAction(
            @ToolParam(description = "The unique ID of the workflow") String id,
            @ToolParam(description = "The workflow action request containing action (START, PAUSE, RESUME, STOP, RERUN_FAILED_STAGE, RERUN_FROM_CHECKPOINT)") WorkflowActionRequest request) {
        Workflow workflow = findEntity(id);
        if (request == null || request.getAction() == null) {
            throw new DatashifterException("Workflow action is required.");
        }

        List<WorkflowNode> nodes = nodeRepository.findByWorkflow_Id(id);
        List<WorkflowEdge> edges = edgeRepository.findByWorkflow_Id(id);
        Map<String, Pipeline> pipelineMap = loadPipelinesMap(nodes);
        TopologyAnalysis topology = analyzeTopology(nodes, edges, pipelineMap);

        switch (request.getAction()) {
            case START, RERUN_FAILED_STAGE, RERUN_FROM_CHECKPOINT -> {
                UserContext.assertPermission(Permissions.WORKFLOW_RUN);
                if (workflow.getStatus() == WorkflowStatus.RUNNING) {
                    throw new DatashifterException("Workflow is already running.");
                }
                if (nodes.isEmpty()) {
                    throw new DatashifterException("Workflow must have at least one pipeline before starting.");
                }
                if (topology.chainCount != 1 || topology.orderedNodes.size() != nodes.size()) {
                    throw new DatashifterException(String.format(
                            "Before running a workflow, there must be only one connected chain of pipelines (currently %d chains).",
                            topology.chainCount));
                }
                if (!topology.validationErrors.isEmpty()) {
                    throw new DatashifterException(String.join(" ", topology.validationErrors));
                }

                // Check subscription parallel run limit
                String orgId = UserContext.getCurrentOrgId();
                long runningCount = pipelineRepository.findByOrgId(orgId).stream()
                        .filter(p -> p.getStatus() == PipelineStatus.RUNNING)
                        .count();
                limitChecker.assertCanRunParallel(orgId, runningCount);

                WorkflowAction actionType = request.getAction();
                Map<String, List<String>> outgoingMap = new HashMap<>();
                Map<String, List<String>> incomingMap = new HashMap<>();
                for (WorkflowEdge e : edges) {
                    outgoingMap.computeIfAbsent(e.getSourcePipelineId(), k -> new ArrayList<>()).add(e.getTargetPipelineId());
                    incomingMap.computeIfAbsent(e.getTargetPipelineId(), k -> new ArrayList<>()).add(e.getSourcePipelineId());
                }

                List<String> targetPipelineIds = new ArrayList<>();
                Set<String> downstreamIds = new HashSet<>();

                if (actionType == WorkflowAction.START) {
                    targetPipelineIds.add(topology.orderedNodes.get(0).getPipelineId());
                    for (int i = 1; i < topology.orderedNodes.size(); i++) {
                        downstreamIds.add(topology.orderedNodes.get(i).getPipelineId());
                    }
                } else {
                    // RERUN_FAILED_STAGE or RERUN_FROM_CHECKPOINT:
                    // 1. Find top-most ERRORED nodes (whose ancestors are not ERRORED)
                    Set<String> erroredSet = new LinkedHashSet<>();
                    for (WorkflowNode n : topology.orderedNodes) {
                        Pipeline p = pipelineMap.get(n.getPipelineId());
                        if (p != null && p.getStatus() == PipelineStatus.ERRORED) {
                            erroredSet.add(n.getPipelineId());
                        }
                    }

                    for (String errPid : erroredSet) {
                        if (!hasAncestorInSet(errPid, incomingMap, erroredSet)) {
                            targetPipelineIds.add(errPid);
                        }
                    }

                    // 2. If no nodes are currently ERRORED (e.g., user edited & re-validated after failure),
                    //    find non-COMPLETED nodes whose predecessors are all COMPLETED
                    if (targetPipelineIds.isEmpty()) {
                        for (WorkflowNode n : topology.orderedNodes) {
                            String pid = n.getPipelineId();
                            Pipeline p = pipelineMap.get(pid);
                            if (p == null || p.getStatus() == PipelineStatus.COMPLETED) {
                                continue;
                            }
                            List<String> preds = incomingMap.getOrDefault(pid, List.of());
                            boolean allPredsCompleted = preds.stream().allMatch(predId -> {
                                Pipeline pred = pipelineMap.get(predId);
                                return pred != null && pred.getStatus() == PipelineStatus.COMPLETED;
                            });
                            if (allPredsCompleted) {
                                targetPipelineIds.add(pid);
                            }
                        }
                    }

                    // 3. Fallback to root if all nodes were COMPLETED
                    if (targetPipelineIds.isEmpty()) {
                        targetPipelineIds.add(topology.orderedNodes.get(0).getPipelineId());
                    }

                    // Collect all strict descendants of targetPipelineIds
                    Deque<String> queue = new ArrayDeque<>(targetPipelineIds);
                    while (!queue.isEmpty()) {
                        String curr = queue.poll();
                        for (String child : outgoingMap.getOrDefault(curr, List.of())) {
                            if (!targetPipelineIds.contains(child) && downstreamIds.add(child)) {
                                queue.add(child);
                            }
                        }
                    }
                }

                Set<String> targetSet = new LinkedHashSet<>(targetPipelineIds);

                for (WorkflowNode node : topology.orderedNodes) {
                    String pid = node.getPipelineId();
                    Pipeline p = pipelineMap.get(pid);
                    if (p == null) continue;

                    if (actionType == WorkflowAction.START) {
                        clearPipelineCheckpoints(pid);
                        p.setStatus(PipelineStatus.VALIDATED);
                        pipelineRepository.save(p);
                    } else if (targetSet.contains(pid)) {
                        if (actionType == WorkflowAction.RERUN_FAILED_STAGE) {
                            clearPipelineCheckpoints(pid);
                        } else {
                            entityManager.createQuery("DELETE FROM ErrorLog e WHERE e.pipelineId = :pipelineId")
                                    .setParameter("pipelineId", pid)
                                    .executeUpdate();
                            if (redisTemplate.opsForHash() != null) {
                                redisTemplate.opsForHash().put("pipeline:" + pid + ":stats", "errorsSkipped", "0");
                            }
                        }
                        p.setStatus(PipelineStatus.VALIDATED);
                        pipelineRepository.save(p);
                    } else if (downstreamIds.contains(pid)) {
                        clearPipelineCheckpoints(pid);
                        p.setStatus(PipelineStatus.VALIDATED);
                        pipelineRepository.save(p);
                    }
                    // Completed upstream / sibling stages not in targetSet or downstreamIds remain COMPLETED
                }

                List<Pipeline> startedPipelines = new ArrayList<>();
                for (String targetPid : targetSet) {
                    Pipeline targetPipeline = pipelineMap.get(targetPid);
                    if (targetPipeline == null) {
                        throw new DatashifterException("Target pipeline not found for workflow execution.");
                    }
                    targetPipeline.setStatus(PipelineStatus.RUNNING);
                    pipelineRepository.save(targetPipeline);
                    startedPipelines.add(targetPipeline);
                }

                workflow.setStatus(WorkflowStatus.RUNNING);
                workflow.setCurrentPipelineId(startedPipelines.get(0).getId());
                workflowRepository.save(workflow);

                String jobAction = (actionType == WorkflowAction.RERUN_FROM_CHECKPOINT) ? "RESUME" : "START";

                for (Pipeline startedPipeline : startedPipelines) {
                    kafkaTemplate.send(KafkaTopics.PIPELINE_JOBS,
                            PipelineJobEvent.builder()
                                    .pipelineId(startedPipeline.getId())
                                    .action(jobAction)
                                    .timestamp(Instant.now())
                                    .build());

                    log.info("Workflow '{}' ({}) triggered action {} on pipeline '{}' ({}) with jobAction={}",
                            workflow.getName(), workflow.getId(), actionType,
                            startedPipeline.getName(), startedPipeline.getId(), jobAction);
                }
            }

            case PAUSE -> {
                UserContext.assertPermission(Permissions.WORKFLOW_PAUSE);
                if (workflow.getStatus() != WorkflowStatus.RUNNING) {
                    throw new DatashifterException("Only a running workflow can be paused.");
                }
                workflow.setStatus(WorkflowStatus.PAUSED);
                workflowRepository.save(workflow);

                Set<String> pausedIds = new HashSet<>();
                for (Pipeline p : pipelineMap.values()) {
                    if (p.getStatus() == PipelineStatus.RUNNING) {
                        p.setStatus(PipelineStatus.PAUSED);
                        pipelineRepository.save(p);
                        pausedIds.add(p.getId());
                        kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                                PipelineCommandEvent.builder()
                                        .pipelineId(p.getId())
                                        .command("PAUSE")
                                        .timestamp(Instant.now())
                                        .build());
                    }
                }
                String activePipelineId = workflow.getCurrentPipelineId();
                if (activePipelineId != null && !pausedIds.contains(activePipelineId)) {
                    pipelineRepository.findById(activePipelineId).ifPresent(p -> {
                        if (p.getStatus() == PipelineStatus.RUNNING) {
                            p.setStatus(PipelineStatus.PAUSED);
                            pipelineRepository.save(p);
                            kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                                    PipelineCommandEvent.builder()
                                            .pipelineId(activePipelineId)
                                            .command("PAUSE")
                                            .timestamp(Instant.now())
                                            .build());
                        }
                    });
                }
                log.info("Paused workflow '{}' ({})", workflow.getName(), workflow.getId());
            }

            case RESUME -> {
                UserContext.assertPermission(Permissions.WORKFLOW_RUN);
                if (workflow.getStatus() != WorkflowStatus.PAUSED) {
                    throw new DatashifterException("Only a paused workflow can be resumed.");
                }
                workflow.setStatus(WorkflowStatus.RUNNING);
                workflowRepository.save(workflow);

                Set<String> resumedIds = new HashSet<>();
                for (Pipeline p : pipelineMap.values()) {
                    if (p.getStatus() == PipelineStatus.PAUSED) {
                        p.setStatus(PipelineStatus.RUNNING);
                        pipelineRepository.save(p);
                        resumedIds.add(p.getId());
                        kafkaTemplate.send(KafkaTopics.PIPELINE_JOBS,
                                PipelineJobEvent.builder()
                                        .pipelineId(p.getId())
                                        .action("RESUME")
                                        .timestamp(Instant.now())
                                        .build());
                    }
                }
                String activePipelineId = workflow.getCurrentPipelineId();
                if (activePipelineId != null && !resumedIds.contains(activePipelineId)) {
                    pipelineRepository.findById(activePipelineId).ifPresent(p -> {
                        p.setStatus(PipelineStatus.RUNNING);
                        pipelineRepository.save(p);
                        kafkaTemplate.send(KafkaTopics.PIPELINE_JOBS,
                                PipelineJobEvent.builder()
                                        .pipelineId(activePipelineId)
                                        .action("RESUME")
                                        .timestamp(Instant.now())
                                        .build());
                    });
                }
                log.info("Resumed workflow '{}' ({})", workflow.getName(), workflow.getId());
            }

            case STOP -> {
                UserContext.assertPermission(Permissions.WORKFLOW_STOP);
                if (workflow.getStatus() != WorkflowStatus.RUNNING
                        && workflow.getStatus() != WorkflowStatus.PAUSED) {
                    throw new DatashifterException("Workflow is not currently running or paused.");
                }
                String activePipelineId = workflow.getCurrentPipelineId();
                workflow.setStatus(WorkflowStatus.STOPPED);
                workflow.setCurrentPipelineId(null);
                workflowRepository.save(workflow);

                Set<String> stoppedIds = new HashSet<>();
                for (Pipeline p : pipelineMap.values()) {
                    if (p.getStatus() == PipelineStatus.RUNNING || p.getStatus() == PipelineStatus.PAUSED) {
                        p.setStatus(PipelineStatus.ERRORED);
                        pipelineRepository.save(p);
                        stoppedIds.add(p.getId());
                        kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                                PipelineCommandEvent.builder()
                                        .pipelineId(p.getId())
                                        .command("STOP")
                                        .timestamp(Instant.now())
                                        .build());
                    }
                }
                if (activePipelineId != null && !stoppedIds.contains(activePipelineId)) {
                    pipelineRepository.findById(activePipelineId).ifPresent(p -> {
                        if (p.getStatus() == PipelineStatus.RUNNING || p.getStatus() == PipelineStatus.PAUSED) {
                            p.setStatus(PipelineStatus.ERRORED);
                            pipelineRepository.save(p);
                            kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                                    PipelineCommandEvent.builder()
                                            .pipelineId(activePipelineId)
                                            .command("STOP")
                                            .timestamp(Instant.now())
                                            .build());
                        }
                    });
                }
                log.info("Stopped workflow '{}' ({})", workflow.getName(), workflow.getId());
            }
            case VALIDATE_PIPELINES -> {
                return validatePipelines(id);
            }
        }

        publishWorkflowStatus(workflow, nodes);
        return toFullResponse(workflow);
    }

    @Override
    @Transactional
    @Tool(description = "Validate all unvalidated pipelines belonging to a workflow and refresh workflow readiness status.")
    public WorkflowResponse validatePipelines(@ToolParam(description = "Workflow ID") String id) {
        Workflow workflow = findEntity(id);
        List<WorkflowNode> nodes = nodeRepository.findByWorkflow_Id(id);
        if (nodes.isEmpty()) {
            return toFullResponse(workflow);
        }

        List<String> pipelineIds = nodes.stream().map(WorkflowNode::getPipelineId).toList();
        List<Pipeline> pipelines = pipelineRepository.findAllById(pipelineIds);

        for (Pipeline pipeline : pipelines) {
            if (pipeline.getStatus() == PipelineStatus.NOT_VALIDATED
                    || pipeline.getStatus() == PipelineStatus.DRAFT
                    || pipeline.getStatus() == PipelineStatus.INVALID) {
                PipelineStatus prevStatus = pipeline.getStatus();
                List<String> valErrors = mappingService.validatePipeline(pipeline);
                if (valErrors.isEmpty()) {
                    pipeline.setStatus(PipelineStatus.VALIDATED);
                    pipeline.setValidationErrors(null);
                } else {
                    pipeline.setStatus(PipelineStatus.INVALID);
                    try {
                        pipeline.setValidationErrors(objectMapper.writeValueAsString(valErrors));
                    } catch (Exception ex) {
                        pipeline.setValidationErrors(String.join("\n", valErrors));
                    }
                }
                pipelineRepository.save(pipeline);
                try {
                    kafkaTemplate.send(KafkaTopics.PIPELINE_STATUS,
                            StatusChangeEvent.builder()
                                    .pipelineId(pipeline.getId())
                                    .previousStatus(prevStatus)
                                    .newStatus(pipeline.getStatus())
                                    .timestamp(Instant.now())
                                    .build());
                } catch (Exception e) {
                    log.warn("Failed to publish pipeline status event for {}: {}", pipeline.getId(), e.getMessage());
                }
            }
        }

        pipelineRepository.flush();
        refreshDerivedStatus(workflow);
        workflow = workflowRepository.save(workflow);
        publishWorkflowStatus(workflow, nodes);

        log.info("Validated pipelines for workflow '{}' ({})", workflow.getName(), workflow.getId());
        return toFullResponse(workflow);
    }

    private boolean hasAncestorInSet(String startPid, Map<String, List<String>> incomingMap, Set<String> targetSet) {
        Set<String> visited = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>(incomingMap.getOrDefault(startPid, List.of()));
        while (!queue.isEmpty()) {
            String curr = queue.poll();
            if (!visited.add(curr)) continue;
            if (targetSet.contains(curr)) {
                return true;
            }
            queue.addAll(incomingMap.getOrDefault(curr, List.of()));
        }
        return false;
    }

    // =========================================================================
    // KAFKA LISTENER — SEQUENTIAL & PARALLEL DAG HANDOFF & FAILURE ACTIONS
    // =========================================================================

    @KafkaListener(topics = KafkaTopics.PIPELINE_STATUS, groupId = "pipeline-service-workflow")
    @Transactional
    public void handlePipelineStatusChange(StatusChangeEvent event) {
        if (event == null || event.getPipelineId() == null || event.getNewStatus() == null) {
            return;
        }

        String pipelineId = event.getPipelineId();
        PipelineStatus newStatus = event.getNewStatus();

        var nodeOpt = nodeRepository.findByPipelineIdWithWorkflow(pipelineId);
        if (nodeOpt.isEmpty()) {
            return;
        }

        WorkflowNode currentNode = nodeOpt.get();
        Workflow workflow = currentNode.getWorkflow();

        // Only orchestrate handoff when the workflow is actively RUNNING
        if (workflow.getStatus() != WorkflowStatus.RUNNING) {
            return;
        }

        // Ensure pipeline status in DB matches the reported status
        pipelineRepository.findById(pipelineId).ifPresent(p -> {
            if (p.getStatus() != newStatus) {
                p.setStatus(newStatus);
                pipelineRepository.save(p);
            }
        });

        if (newStatus != PipelineStatus.COMPLETED && newStatus != PipelineStatus.ERRORED) {
            return;
        }

        List<WorkflowNode> allNodes = nodeRepository.findByWorkflow_Id(workflow.getId());
        Map<String, Pipeline> pipelineMap = new HashMap<>(loadPipelinesMap(allNodes));
        pipelineRepository.findById(pipelineId).ifPresent(p -> pipelineMap.put(pipelineId, p));

        List<WorkflowEdge> allEdges = mergeEdges(edgeRepository.findByWorkflow_Id(workflow.getId()),
                edgeRepository.findByWorkflow_IdAndSourcePipelineId(workflow.getId(), pipelineId));
        List<WorkflowEdge> outgoingEdges = allEdges.stream()
                .filter(e -> pipelineId.equals(e.getSourcePipelineId()))
                .toList();

        if (newStatus == PipelineStatus.COMPLETED) {
            for (WorkflowEdge edge : outgoingEdges) {
                String nextPipelineId = edge.getTargetPipelineId();
                if (canTriggerSuccessor(nextPipelineId, allEdges, pipelineMap)) {
                    log.info("Workflow '{}': pipeline '{}' completed. Triggering successor pipeline '{}'.",
                            workflow.getName(), pipelineId, nextPipelineId);
                    triggerSuccessorPipeline(workflow, allNodes, nextPipelineId, pipelineMap, pipelineId);
                }
            }
            finalizeOrUpdateWorkflowExecutionState(workflow, allNodes, pipelineMap);

        } else if (newStatus == PipelineStatus.ERRORED) {
            if (outgoingEdges.isEmpty()) {
                finalizeOrUpdateWorkflowExecutionState(workflow, allNodes, pipelineMap);
                log.warn("Workflow '{}': leaf pipeline '{}' failed.", workflow.getName(), pipelineId);
                return;
            }

            // Check if any outgoing edge from the failed pipeline requires stopping the entire workflow
            boolean shouldStopWorkflow = outgoingEdges.stream()
                    .map(this::effectiveFailureAction)
                    .anyMatch(a -> a == WorkflowFailureAction.STOP_WORKFLOW);

            if (shouldStopWorkflow) {
                log.warn("Workflow '{}': pipeline '{}' failed and edge action is STOP_WORKFLOW. Stopping all running pipelines and aborting workflow.",
                        workflow.getName(), pipelineId);
                stopAllOtherRunningPipelines(pipelineId, allNodes, pipelineMap);
                workflow.setStatus(WorkflowStatus.FAILED);
                workflow.setCurrentPipelineId(null);
                workflowRepository.save(workflow);
                publishWorkflowStatus(workflow, allNodes);
                return;
            }

            // Otherwise evaluate CONTINUE_PIPELINE and STOP_PIPELINE per outgoing edge
            for (WorkflowEdge edge : outgoingEdges) {
                WorkflowFailureAction action = effectiveFailureAction(edge);
                String targetPipelineId = edge.getTargetPipelineId();

                if (action == WorkflowFailureAction.CONTINUE_PIPELINE) {
                    if (canTriggerSuccessor(targetPipelineId, allEdges, pipelineMap)) {
                        log.warn("Workflow '{}': pipeline '{}' failed, but edge action is CONTINUE_PIPELINE. Starting '{}'.",
                                workflow.getName(), pipelineId, targetPipelineId);
                        triggerSuccessorPipeline(workflow, allNodes, targetPipelineId, pipelineMap);
                    }
                } else if (action == WorkflowFailureAction.STOP_PIPELINE) {
                    log.warn("Workflow '{}': pipeline '{}' failed and edge action is STOP_PIPELINE for '{}'.",
                            workflow.getName(), pipelineId, targetPipelineId);
                    Pipeline targetPipeline = resolvePipeline(targetPipelineId, pipelineMap);
                    if (targetPipeline != null) {
                        targetPipeline.setStatus(PipelineStatus.ERRORED);
                        pipelineRepository.save(targetPipeline);
                        pipelineMap.put(targetPipelineId, targetPipeline);
                    }

                    // Check if the stopped pipeline has downstream successors in the chain
                    List<WorkflowEdge> nextEdges = edgeRepository.findByWorkflow_IdAndSourcePipelineId(
                            workflow.getId(), targetPipelineId);
                    allEdges = mergeEdges(allEdges, nextEdges);
                    for (WorkflowEdge nextEdge : nextEdges) {
                        String downstreamPipelineId = nextEdge.getTargetPipelineId();
                        if (canTriggerSuccessorAfterStoppedNode(downstreamPipelineId, targetPipelineId, allEdges, pipelineMap)) {
                            log.info("Workflow '{}': skipping stopped pipeline '{}' and advancing to downstream pipeline '{}'.",
                                    workflow.getName(), targetPipelineId, downstreamPipelineId);
                            triggerSuccessorPipeline(workflow, allNodes, downstreamPipelineId, pipelineMap);
                        }
                    }
                }
            }

            finalizeOrUpdateWorkflowExecutionState(workflow, allNodes, pipelineMap);
        }
    }

    private WorkflowFailureAction effectiveFailureAction(WorkflowEdge edge) {
        return edge.getOnFailureAction() != null
                ? edge.getOnFailureAction()
                : WorkflowFailureAction.STOP_WORKFLOW;
    }

    private List<WorkflowEdge> mergeEdges(List<WorkflowEdge> base, List<WorkflowEdge> extra) {
        Map<String, WorkflowEdge> merged = new LinkedHashMap<>();
        if (base != null) {
            for (WorkflowEdge e : base) {
                merged.put(e.getSourcePipelineId() + "->" + e.getTargetPipelineId(), e);
            }
        }
        if (extra != null) {
            for (WorkflowEdge e : extra) {
                merged.put(e.getSourcePipelineId() + "->" + e.getTargetPipelineId(), e);
            }
        }
        return new ArrayList<>(merged.values());
    }

    private Pipeline resolvePipeline(String pipelineId, Map<String, Pipeline> pipelineMap) {
        Pipeline p = pipelineMap.get(pipelineId);
        if (p == null) {
            p = pipelineRepository.findById(pipelineId).orElse(null);
            if (p != null) {
                pipelineMap.put(pipelineId, p);
            }
        }
        return p;
    }

    /**
     * Checks whether a successor pipeline is ready to be triggered in a DAG (supports Fan-in N -> 1 join).
     * All predecessors must have finished (COMPLETED or ERRORED), and any ERRORED predecessor must have
     * its incoming edge to targetPipelineId configured as CONTINUE_PIPELINE.
     */
    private boolean canTriggerSuccessor(String targetPipelineId, List<WorkflowEdge> allEdges, Map<String, Pipeline> pipelineMap) {
        Pipeline target = resolvePipeline(targetPipelineId, pipelineMap);
        if (target != null && (target.getStatus() == PipelineStatus.RUNNING || target.getStatus() == PipelineStatus.COMPLETED)) {
            return false;
        }

        List<WorkflowEdge> incomingEdges = allEdges.stream()
                .filter(e -> targetPipelineId.equals(e.getTargetPipelineId()))
                .toList();

        for (WorkflowEdge inEdge : incomingEdges) {
            Pipeline pred = resolvePipeline(inEdge.getSourcePipelineId(), pipelineMap);
            if (pred == null) {
                return false;
            }
            PipelineStatus predStatus = pred.getStatus();
            if (predStatus == PipelineStatus.COMPLETED) {
                continue;
            }
            if (predStatus == PipelineStatus.ERRORED) {
                if (effectiveFailureAction(inEdge) != WorkflowFailureAction.CONTINUE_PIPELINE) {
                    return false;
                }
                continue;
            }
            // Predecessor is still VALIDATED / RUNNING / PAUSED
            return false;
        }
        return true;
    }

    private boolean canTriggerSuccessorAfterStoppedNode(
            String downstreamPipelineId,
            String stoppedPipelineId,
            List<WorkflowEdge> allEdges,
            Map<String, Pipeline> pipelineMap) {
        Pipeline target = resolvePipeline(downstreamPipelineId, pipelineMap);
        if (target != null && (target.getStatus() == PipelineStatus.RUNNING || target.getStatus() == PipelineStatus.COMPLETED)) {
            return false;
        }

        List<WorkflowEdge> incomingEdges = allEdges.stream()
                .filter(e -> downstreamPipelineId.equals(e.getTargetPipelineId()))
                .toList();

        for (WorkflowEdge inEdge : incomingEdges) {
            String predId = inEdge.getSourcePipelineId();
            if (predId.equals(stoppedPipelineId)) {
                continue;
            }
            Pipeline pred = resolvePipeline(predId, pipelineMap);
            if (pred == null) {
                return false;
            }
            PipelineStatus predStatus = pred.getStatus();
            if (predStatus == PipelineStatus.COMPLETED) {
                continue;
            }
            if (predStatus == PipelineStatus.ERRORED && effectiveFailureAction(inEdge) == WorkflowFailureAction.CONTINUE_PIPELINE) {
                continue;
            }
            return false;
        }
        return true;
    }

    private void stopAllOtherRunningPipelines(String failedPipelineId, List<WorkflowNode> allNodes, Map<String, Pipeline> pipelineMap) {
        for (WorkflowNode node : allNodes) {
            String pid = node.getPipelineId();
            if (pid.equals(failedPipelineId)) {
                continue;
            }
            Pipeline p = resolvePipeline(pid, pipelineMap);
            if (p != null && (p.getStatus() == PipelineStatus.RUNNING || p.getStatus() == PipelineStatus.PAUSED)) {
                p.setStatus(PipelineStatus.ERRORED);
                pipelineRepository.save(p);
                kafkaTemplate.send(KafkaTopics.PIPELINE_COMMANDS,
                        PipelineCommandEvent.builder()
                                .pipelineId(pid)
                                .command("STOP")
                                .timestamp(Instant.now())
                                .build());
            }
        }
    }

    private void finalizeOrUpdateWorkflowExecutionState(Workflow workflow, List<WorkflowNode> allNodes, Map<String, Pipeline> pipelineMap) {
        if (workflow.getStatus() != WorkflowStatus.RUNNING) {
            return;
        }

        List<Pipeline> runningPipelines = new ArrayList<>();
        boolean anyFailed = false;

        for (WorkflowNode n : allNodes) {
            Pipeline p = resolvePipeline(n.getPipelineId(), pipelineMap);
            if (p == null) continue;
            if (p.getStatus() == PipelineStatus.RUNNING) {
                runningPipelines.add(p);
            } else if (p.getStatus() == PipelineStatus.ERRORED) {
                anyFailed = true;
            }
        }

        if (!runningPipelines.isEmpty()) {
            // Other parallel pipelines or newly triggered successors are still running
            boolean currentStillRunning = workflow.getCurrentPipelineId() != null
                    && runningPipelines.stream().anyMatch(p -> p.getId().equals(workflow.getCurrentPipelineId()));
            if (!currentStillRunning) {
                workflow.setCurrentPipelineId(runningPipelines.get(0).getId());
            }
            workflowRepository.save(workflow);
            publishWorkflowStatus(workflow, allNodes);
        } else {
            // No pipelines remain RUNNING — workflow execution has finished
            workflow.setStatus(anyFailed ? WorkflowStatus.FAILED : WorkflowStatus.COMPLETED);
            workflow.setCurrentPipelineId(null);
            workflowRepository.save(workflow);
            publishWorkflowStatus(workflow, allNodes);
            log.info("Workflow '{}' finished with status {}", workflow.getName(), workflow.getStatus());
        }
    }

    private void triggerSuccessorPipeline(
            Workflow workflow,
            List<WorkflowNode> allNodes,
            String nextPipelineId,
            Map<String, Pipeline> pipelineMap) {
        triggerSuccessorPipeline(workflow, allNodes, nextPipelineId, pipelineMap, null);
    }

    private void triggerSuccessorPipeline(
            Workflow workflow,
            List<WorkflowNode> allNodes,
            String nextPipelineId,
            Map<String, Pipeline> pipelineMap,
            String upstreamPipelineId) {
        WorkflowNode nextNode = allNodes.stream()
                .filter(n -> n.getPipelineId().equals(nextPipelineId))
                .findFirst()
                .orElse(null);

        Pipeline nextPipeline = resolvePipeline(nextPipelineId, pipelineMap);

        if (nextNode == null || nextPipeline == null) {
            workflow.setStatus(WorkflowStatus.FAILED);
            workflow.setCurrentPipelineId(null);
            workflowRepository.save(workflow);
            publishWorkflowStatus(workflow, allNodes);
            return;
        }

        // Automatic Workflow DAG Hand-off:
        // When successor is a continuous CDC pipeline, inject captured snapshot SCN from upstream pipeline
        if (nextPipeline.getPipelineMode() == com.datashifter.common.enums.PipelineMode.CDC) {
            String sourcePid = upstreamPipelineId;
            if (sourcePid == null) {
                List<WorkflowEdge> incoming = edgeRepository.findByWorkflow_Id(workflow.getId()).stream()
                        .filter(e -> nextPipelineId.equals(e.getTargetPipelineId()))
                        .toList();
                if (!incoming.isEmpty()) {
                    sourcePid = incoming.get(0).getSourcePipelineId();
                }
            }
            if (sourcePid != null) {
                Pipeline upstreamPipeline = resolvePipeline(sourcePid, pipelineMap);
                if (upstreamPipeline != null && upstreamPipeline.getCdcStartingScn() != null && !upstreamPipeline.getCdcStartingScn().isBlank()) {
                    if (nextPipeline.getCdcStartingScn() == null || nextPipeline.getCdcStartingScn().isBlank()) {
                        nextPipeline.setCdcStartingScn(upstreamPipeline.getCdcStartingScn());
                        log.info("Workflow '{}': Injected snapshot SCN '{}' from upstream batch pipeline '{}' into downstream CDC pipeline '{}'.",
                                workflow.getName(), upstreamPipeline.getCdcStartingScn(), upstreamPipeline.getId(), nextPipeline.getId());
                    }
                }
            }
        }

        nextPipeline.setStatus(PipelineStatus.RUNNING);
        pipelineRepository.save(nextPipeline);
        pipelineMap.put(nextPipelineId, nextPipeline);

        workflow.setCurrentPipelineId(nextPipeline.getId());
        workflowRepository.save(workflow);

        kafkaTemplate.send(KafkaTopics.PIPELINE_JOBS,
                PipelineJobEvent.builder()
                        .pipelineId(nextPipeline.getId())
                        .action("START")
                        .timestamp(Instant.now())
                        .build());

        publishWorkflowStatus(workflow, allNodes);
    }


    private void publishWorkflowStatus(Workflow workflow, List<WorkflowNode> nodes) {
        Map<String, String> statuses = new HashMap<>();
        if (nodes != null && !nodes.isEmpty()) {
            Map<String, Pipeline> pipelineMap = loadPipelinesMap(nodes);
            for (WorkflowNode n : nodes) {
                Pipeline p = pipelineMap.get(n.getPipelineId());
                if (p != null && p.getStatus() != null) {
                    statuses.put(p.getId(), p.getStatus().name());
                }
            }
        }
        kafkaTemplate.send(KafkaTopics.WORKFLOW_STATUS,
                WorkflowStatusEvent.builder()
                        .workflowId(workflow.getId())
                        .orgId(workflow.getOrgId())
                        .status(workflow.getStatus())
                        .currentPipelineId(workflow.getCurrentPipelineId())
                        .pipelineStatuses(statuses)
                        .timestamp(Instant.now())
                        .build());
    }

    private void clearPipelineCheckpoints(String pipelineId) {
        entityManager.createQuery("DELETE FROM ChunkCursor c WHERE c.pipelineId = :pipelineId")
                .setParameter("pipelineId", pipelineId)
                .executeUpdate();
        entityManager.createQuery("DELETE FROM ErrorLog e WHERE e.pipelineId = :pipelineId")
                .setParameter("pipelineId", pipelineId)
                .executeUpdate();
        var checkpointKeys = redisTemplate.keys("pipeline:" + pipelineId + ":table:*:checkpoint");
        if (checkpointKeys != null && !checkpointKeys.isEmpty()) {
            redisTemplate.delete(checkpointKeys);
        }
        redisTemplate.delete("pipeline:" + pipelineId + ":stats");
    }

    // =========================================================================
    // CANVAS GRAPH APPLICATION & DAG TOPOLOGY ANALYSIS
    // =========================================================================

    private void applyCanvasState(Workflow workflow, List<WorkflowNodeInput> nodeInputs, List<WorkflowEdgeInput> edgeInputs) {
        List<WorkflowNodeInput> safeNodes = nodeInputs != null ? nodeInputs : List.of();
        List<WorkflowEdgeInput> safeEdges = edgeInputs != null ? edgeInputs : List.of();

        // 1. Validate uniqueness of nodes in request
        Set<String> requestedPipelineIds = new LinkedHashSet<>();
        for (WorkflowNodeInput ni : safeNodes) {
            if (ni.getPipelineId() == null || ni.getPipelineId().isBlank()) {
                throw new DatashifterException("Pipeline ID cannot be blank in workflow step.");
            }
            if (!requestedPipelineIds.add(ni.getPipelineId())) {
                throw new DatashifterException("Duplicate pipeline in workflow: " + ni.getPipelineId());
            }
        }

        // 2. Validate DAG edges (allow 1->N fan-out and N->1 fan-in, forbid self-loops and cycles)
        Map<String, List<String>> adjList = new HashMap<>();
        Set<String> uniqueEdgeKeys = new HashSet<>();
        List<WorkflowEdgeInput> deduplicatedEdges = new ArrayList<>();

        for (WorkflowEdgeInput ei : safeEdges) {
            String src = ei.getSourcePipelineId();
            String tgt = ei.getTargetPipelineId();
            if (src == null || tgt == null || src.equals(tgt)) {
                throw new DatashifterException("Invalid link between pipelines.");
            }
            if (!requestedPipelineIds.contains(src) || !requestedPipelineIds.contains(tgt)) {
                throw new DatashifterException("Cannot link pipelines that are not part of this workflow.");
            }
            String edgeKey = src + "->" + tgt;
            if (uniqueEdgeKeys.add(edgeKey)) {
                adjList.computeIfAbsent(src, k -> new ArrayList<>()).add(tgt);
                deduplicatedEdges.add(ei);
            }
        }

        // Cycle check across DAG using 3-color DFS (0=unvisited, 1=visiting, 2=visited)
        Map<String, Integer> visitState = new HashMap<>();
        for (String startId : requestedPipelineIds) {
            if (visitState.getOrDefault(startId, 0) == 0) {
                if (hasCycleDfs(startId, adjList, visitState)) {
                    throw new DatashifterException("Circular pipeline links are not allowed in a workflow.");
                }
            }
        }

        // 3. Validate each pipeline belongs to org, is not locked by another workflow, and is VALIDATED (if newly added)
        for (String pid : requestedPipelineIds) {
            validatePipelineEligibleForWorkflow(pid, workflow.getId());
        }

        // 4. Replace edges and sync nodes
        edgeRepository.deleteByWorkflow_Id(workflow.getId());
        edgeRepository.flush();

        List<WorkflowNode> existingNodes = nodeRepository.findByWorkflow_Id(workflow.getId());
        Map<String, WorkflowNode> existingByPid = existingNodes.stream()
                .collect(Collectors.toMap(WorkflowNode::getPipelineId, n -> n));

        // Delete removed nodes
        for (WorkflowNode existing : existingNodes) {
            if (!requestedPipelineIds.contains(existing.getPipelineId())) {
                nodeRepository.delete(existing);
            }
        }
        nodeRepository.flush();

        // Upsert current nodes
        int idx = 0;
        for (WorkflowNodeInput ni : safeNodes) {
            WorkflowNode node = existingByPid.get(ni.getPipelineId());
            double posX = ni.getPositionX() != null ? ni.getPositionX() : 280.0;
            double posY = ni.getPositionY() != null ? ni.getPositionY() : (60.0 + idx * 140.0);
            if (node == null) {
                node = WorkflowNode.builder()
                        .workflow(workflow)
                        .pipelineId(ni.getPipelineId())
                        .positionX(posX)
                        .positionY(posY)
                        .build();
            } else {
                node.setPositionX(posX);
                node.setPositionY(posY);
            }
            nodeRepository.save(node);
            idx++;
        }
        nodeRepository.flush();

        // Insert edges
        for (WorkflowEdgeInput ei : deduplicatedEdges) {
            WorkflowEdge edge = WorkflowEdge.builder()
                    .workflow(workflow)
                    .sourcePipelineId(ei.getSourcePipelineId())
                    .targetPipelineId(ei.getTargetPipelineId())
                    .onFailureAction(ei.getOnFailureAction() != null
                            ? ei.getOnFailureAction()
                            : WorkflowFailureAction.STOP_WORKFLOW)
                    .build();
            edgeRepository.save(edge);
        }
        edgeRepository.flush();

        refreshDerivedStatus(workflow);
        Workflow saved = workflowRepository.save(workflow);
        if (saved != null) {
            workflow = saved;
        }
        publishWorkflowStatus(workflow, nodeRepository.findByWorkflow_Id(workflow.getId()));
    }

    private boolean hasCycleDfs(String current, Map<String, List<String>> adjList, Map<String, Integer> visitState) {
        visitState.put(current, 1); // visiting
        for (String neighbor : adjList.getOrDefault(current, List.of())) {
            int state = visitState.getOrDefault(neighbor, 0);
            if (state == 1) {
                return true;
            }
            if (state == 0 && hasCycleDfs(neighbor, adjList, visitState)) {
                return true;
            }
        }
        visitState.put(current, 2); // visited
        return false;
    }

    @Override
    @Transactional
    public void syncWorkflowStatusForPipeline(String pipelineId) {
        nodeRepository.findByPipelineIdWithWorkflow(pipelineId).ifPresent(node -> {
            Workflow workflow = node.getWorkflow();
            WorkflowStatus prevStatus = workflow.getStatus();
            refreshDerivedStatus(workflow);
            workflow = workflowRepository.save(workflow);
            List<WorkflowNode> allNodes = nodeRepository.findByWorkflow_Id(workflow.getId());
            publishWorkflowStatus(workflow, allNodes);
            if (prevStatus != workflow.getStatus()) {
                log.info("Synced workflow '{}' ({}) status from {} to {} after pipeline {} update",
                        workflow.getName(), workflow.getId(), prevStatus, workflow.getStatus(), pipelineId);
            }
        });
    }

    private Pipeline validatePipelineEligibleForWorkflow(String pipelineId, String currentWorkflowId) {
        Pipeline pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline", pipelineId));

        String currentOrgId = UserContext.getCurrentOrgId();
        if (currentOrgId != null && pipeline.getCreatedBy() != null
                && pipeline.getCreatedBy().getOrganization() != null
                && !currentOrgId.equals(pipeline.getCreatedBy().getOrganization().getId())) {
            throw new DatashifterException("Pipeline not found or access denied: " + pipelineId);
        }

        var existingNodeOpt = nodeRepository.findByPipelineIdWithWorkflow(pipelineId);
        if (existingNodeOpt.isPresent()) {
            Workflow ownerWf = existingNodeOpt.get().getWorkflow();
            if (!ownerWf.getId().equals(currentWorkflowId)) {
                throw new DatashifterException(String.format(
                        "Pipeline '%s' already belongs to workflow '%s'. A pipeline can belong to at most one workflow.",
                        pipeline.getName(), ownerWf.getName()));
            }
            return pipeline;
        }

        // Newly imported pipeline must be in VALIDATED status
        if (pipeline.getStatus() != PipelineStatus.VALIDATED) {
            throw new DatashifterException(String.format(
                    "Pipeline '%s' must be in VALIDATED status before it can be added to a workflow (current status: %s).",
                    pipeline.getName(), pipeline.getStatus()));
        }

        return pipeline;
    }

    private void refreshDerivedStatus(Workflow workflow) {
        if (workflow.getStatus() == WorkflowStatus.RUNNING || workflow.getStatus() == WorkflowStatus.PAUSED) {
            return;
        }
        List<WorkflowNode> nodes = nodeRepository.findByWorkflow_Id(workflow.getId());
        List<WorkflowEdge> edges = edgeRepository.findByWorkflow_Id(workflow.getId());
        Map<String, Pipeline> pipelineMap = loadPipelinesMap(nodes);
        TopologyAnalysis analysis = analyzeTopology(nodes, edges, pipelineMap);

        if (nodes.isEmpty()) {
            workflow.setStatus(WorkflowStatus.DRAFT);
        } else if (analysis.singleChainReady) {
            workflow.setStatus(WorkflowStatus.READY);
        } else {
            workflow.setStatus(WorkflowStatus.DRAFT);
        }
    }

    private Map<String, Pipeline> loadPipelinesMap(List<WorkflowNode> nodes) {
        if (nodes == null || nodes.isEmpty()) {
            return Map.of();
        }
        List<String> ids = nodes.stream().map(WorkflowNode::getPipelineId).toList();
        return pipelineRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Pipeline::getId, p -> p, (a, b) -> a));
    }

    private static class TopologyAnalysis {
        int chainCount;
        boolean singleChainReady;
        List<WorkflowNode> orderedNodes;
        List<String> validationErrors;
    }

    private TopologyAnalysis analyzeTopology(List<WorkflowNode> nodes, List<WorkflowEdge> edges, Map<String, Pipeline> pipelineMap) {
        TopologyAnalysis res = new TopologyAnalysis();
        res.validationErrors = new ArrayList<>();
        res.orderedNodes = new ArrayList<>();

        if (nodes == null || nodes.isEmpty()) {
            res.chainCount = 0;
            res.singleChainReady = false;
            res.validationErrors.add("Workflow must contain at least one pipeline.");
            return res;
        }

        Map<String, WorkflowNode> nodeByPid = new LinkedHashMap<>();
        for (WorkflowNode n : nodes) {
            nodeByPid.put(n.getPipelineId(), n);
        }

        Map<String, List<String>> outgoingMap = new HashMap<>();
        Map<String, List<String>> incomingMap = new HashMap<>();
        Map<String, Integer> inDegree = new HashMap<>();
        for (WorkflowNode n : nodes) {
            inDegree.put(n.getPipelineId(), 0);
        }

        if (edges != null) {
            Set<String> seenEdges = new HashSet<>();
            for (WorkflowEdge e : edges) {
                String src = e.getSourcePipelineId();
                String tgt = e.getTargetPipelineId();
                if (nodeByPid.containsKey(src) && nodeByPid.containsKey(tgt) && !src.equals(tgt)) {
                    if (seenEdges.add(src + "->" + tgt)) {
                        outgoingMap.computeIfAbsent(src, k -> new ArrayList<>()).add(tgt);
                        incomingMap.computeIfAbsent(tgt, k -> new ArrayList<>()).add(src);
                        inDegree.put(tgt, inDegree.getOrDefault(tgt, 0) + 1);
                    }
                }
            }
        }

        Comparator<WorkflowNode> nodeOrderComparator = Comparator
                .comparing((WorkflowNode n) -> n.getPositionY() != null ? n.getPositionY() : 0.0)
                .thenComparing(n -> n.getPositionX() != null ? n.getPositionX() : 0.0)
                .thenComparing(n -> n.getCreatedAt() != null ? n.getCreatedAt() : Instant.EPOCH);

        // Find all chain heads (in-degree == 0)
        List<WorkflowNode> heads = nodes.stream()
                .filter(n -> inDegree.getOrDefault(n.getPipelineId(), 0) == 0)
                .sorted(nodeOrderComparator)
                .toList();

        res.chainCount = heads.size();
        Set<String> visited = new HashSet<>();
        Deque<WorkflowNode> queue = new ArrayDeque<>(heads);

        while (!queue.isEmpty()) {
            WorkflowNode currNode = queue.poll();
            String currPid = currNode.getPipelineId();
            if (!visited.add(currPid)) {
                continue;
            }
            res.orderedNodes.add(currNode);

            List<WorkflowNode> readyChildren = new ArrayList<>();
            for (String childPid : outgoingMap.getOrDefault(currPid, List.of())) {
                int newDeg = inDegree.getOrDefault(childPid, 0) - 1;
                inDegree.put(childPid, newDeg);
                if (newDeg <= 0 && !visited.contains(childPid)) {
                    WorkflowNode childNode = nodeByPid.get(childPid);
                    if (childNode != null) {
                        readyChildren.add(childNode);
                    }
                }
            }
            readyChildren.sort(nodeOrderComparator);
            queue.addAll(readyChildren);
        }

        // Add any remaining unvisited nodes (in case of unexpected cycle in DB)
        for (WorkflowNode n : nodes) {
            if (visited.add(n.getPipelineId())) {
                res.orderedNodes.add(n);
                res.chainCount++;
            }
        }

        if (res.chainCount > 1) {
            res.validationErrors.add(String.format(
                    "Workflow currently has %d disconnected chains. Link all pipelines into a single chain before running.",
                    res.chainCount));
        }

        for (WorkflowNode n : res.orderedNodes) {
            Pipeline p = pipelineMap.get(n.getPipelineId());
            if (p == null) {
                res.validationErrors.add("Missing pipeline: " + n.getPipelineId());
                continue;
            }
            if (p.getStatus() == PipelineStatus.DRAFT
                    || p.getStatus() == PipelineStatus.NOT_VALIDATED
                    || p.getStatus() == PipelineStatus.INVALID) {
                String detail = "";
                if (p.getValidationErrors() != null && !p.getValidationErrors().isBlank()) {
                    try {
                        List<String> pErrors = objectMapper.readValue(p.getValidationErrors(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                        detail = " (" + String.join(", ", pErrors) + ")";
                    } catch (Exception ex) {
                        detail = " (" + p.getValidationErrors() + ")";
                    }
                }
                res.validationErrors.add(String.format(
                        "Pipeline '%s' is in %s status and must be VALIDATED before starting the workflow.%s",
                        p.getName(), p.getStatus(), detail));
            }
        }

        res.singleChainReady = (nodes.size() >= 1)
                && (res.chainCount == 1)
                && (res.orderedNodes.size() == nodes.size())
                && res.validationErrors.isEmpty();

        return res;
    }

    // =========================================================================
    // ENTITY LOOKUP & RESPONSE MAPPING
    // =========================================================================

    private Workflow findEntity(String id) {
        String orgId = UserContext.getCurrentOrgId();
        return workflowRepository.findByIdAndOrgId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow", id));
    }

    private void assertNotRunningOrPaused(Workflow workflow, String message) {
        if (workflow.getStatus() == WorkflowStatus.RUNNING || workflow.getStatus() == WorkflowStatus.PAUSED) {
            throw new DatashifterException(message);
        }
    }

    private WorkflowResponse toFullResponse(Workflow w) {
        List<WorkflowNode> nodes = nodeRepository.findByWorkflow_Id(w.getId());
        List<WorkflowEdge> edges = edgeRepository.findByWorkflow_Id(w.getId());
        Map<String, Pipeline> pipelineMap = loadPipelinesMap(nodes);
        TopologyAnalysis topology = analyzeTopology(nodes, edges, pipelineMap);

        // Cache connection names for clean step subtitles
        Map<String, String> connNames = new HashMap<>();
        for (WorkflowNode n : topology.orderedNodes) {
            Pipeline p = pipelineMap.get(n.getPipelineId());
            if (p == null) continue;
            connNames.computeIfAbsent(p.getSourceConnectionId(), cid ->
                    connectionRepository.findById(cid).map(Connection::getName).orElse("Source"));
            connNames.computeIfAbsent(p.getTargetConnectionId(), cid ->
                    connectionRepository.findById(cid).map(Connection::getName).orElse("Target"));
        }

        List<WorkflowNodeResponse> nodeResponses = new ArrayList<>();
        double totalProgressSum = 0.0;
        long totalRowsProcessed = 0L;
        long totalErrorsSkipped = 0L;

        for (WorkflowNode n : topology.orderedNodes) {
            Pipeline p = pipelineMap.get(n.getPipelineId());
            if (p == null) continue;
            String statsKey = "pipeline:" + p.getId() + ":stats";
            Map<Object, Object> stats = redisTemplate.opsForHash().entries(statsKey);

            double progress = getDoubleFromMap(stats, "overallProgress");
            if (p.getStatus() == PipelineStatus.COMPLETED) {
                progress = 100.0;
            }
            long rowsProcessed = getLongFromMap(stats, "rowsProcessed");
            long rowsPerSec = getLongFromMap(stats, "rowsPerSec");
            long errorsSkipped = getLongFromMap(stats, "errorsSkipped");
            String eta = getStringFromMap(stats, "eta");

            totalProgressSum += progress;
            totalRowsProcessed += rowsProcessed;
            totalErrorsSkipped += errorsSkipped;

            List<String> nodeValErrors = null;
            if (p.getValidationErrors() != null && !p.getValidationErrors().isBlank()) {
                try {
                    nodeValErrors = objectMapper.readValue(p.getValidationErrors(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                } catch (Exception ex) {
                    nodeValErrors = List.of(p.getValidationErrors());
                }
            }

            nodeResponses.add(WorkflowNodeResponse.builder()
                    .id(n.getId())
                    .pipelineId(p.getId())
                    .pipelineName(p.getName())
                    .sourceName(connNames.getOrDefault(p.getSourceConnectionId(), "Source"))
                    .targetName(connNames.getOrDefault(p.getTargetConnectionId(), "Target"))
                    .tableCount(p.getPipelineTables() != null ? p.getPipelineTables().size() : 0)
                    .pipelineStatus(p.getStatus())
                    .positionX(n.getPositionX())
                    .positionY(n.getPositionY())
                    .progress(progress)
                    .rowsProcessed(rowsProcessed)
                    .rowsPerSec(rowsPerSec)
                    .errorsSkipped(errorsSkipped)
                    .eta(eta)
                    .pipelineMode(p.getPipelineMode())
                    .validationErrors(nodeValErrors)
                    .build());
        }

        WorkflowStatus effectiveStatus = resolveEffectiveStatus(w, topology);
        double overallProgress = nodeResponses.isEmpty() ? 0.0 : (totalProgressSum / nodeResponses.size());
        if (effectiveStatus == WorkflowStatus.COMPLETED) {
            overallProgress = 100.0;
        }

        List<WorkflowEdgeResponse> edgeResponses = edges.stream()
                .map(e -> WorkflowEdgeResponse.builder()
                        .id(e.getId())
                        .sourcePipelineId(e.getSourcePipelineId())
                        .targetPipelineId(e.getTargetPipelineId())
                        .onFailureAction(e.getOnFailureAction())
                        .build())
                .toList();

        AppUser createdBy = w.getCreatedBy();

        return WorkflowResponse.builder()
                .id(w.getId())
                .orgId(w.getOrgId())
                .namespaceId(w.getNamespace() != null ? w.getNamespace().getId() : null)
                .namespaceName(w.getNamespace() != null ? w.getNamespace().getName() : null)
                .name(w.getName())
                .description(w.getDescription())
                .status(effectiveStatus)
                .currentPipelineId(w.getCurrentPipelineId())
                .singleChainReady(topology.singleChainReady)
                .chainCount(topology.chainCount)
                .overallProgress(Math.round(overallProgress * 10.0) / 10.0)
                .totalRowsProcessed(totalRowsProcessed)
                .totalErrorsSkipped(totalErrorsSkipped)
                .validationErrors(topology.validationErrors)
                .nodes(nodeResponses)
                .edges(edgeResponses)
                .ownerName(createdBy != null ? createdBy.getFullName() : "Unknown")
                .ownerInitials(computeInitials(createdBy))
                .ownerColor(createdBy != null ? createdBy.getAvatarColor() : "#4F46E5")
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .build();
    }

    private WorkflowSummaryResponse toSummaryResponse(Workflow w) {
        List<WorkflowNode> nodes = nodeRepository.findByWorkflow_Id(w.getId());
        List<WorkflowEdge> edges = edgeRepository.findByWorkflow_Id(w.getId());
        Map<String, Pipeline> pipelineMap = loadPipelinesMap(nodes);
        TopologyAnalysis topology = analyzeTopology(nodes, edges, pipelineMap);
        WorkflowStatus effectiveStatus = resolveEffectiveStatus(w, topology);

        List<String> orderedNames = topology.orderedNodes.stream()
                .map(n -> {
                    Pipeline p = pipelineMap.get(n.getPipelineId());
                    return p != null ? p.getName() : n.getPipelineId();
                })
                .toList();

        double totalProgressSum = 0.0;
        for (WorkflowNode n : topology.orderedNodes) {
            Pipeline p = pipelineMap.get(n.getPipelineId());
            if (p == null) continue;
            if (p.getStatus() == PipelineStatus.COMPLETED) {
                totalProgressSum += 100.0;
            } else if (p.getStatus() == PipelineStatus.RUNNING || p.getStatus() == PipelineStatus.PAUSED) {
                String statsKey = "pipeline:" + p.getId() + ":stats";
                Object val = redisTemplate.opsForHash().get(statsKey, "overallProgress");
                if (val != null) {
                    try { totalProgressSum += Double.parseDouble(val.toString()); } catch (NumberFormatException ignored) {}
                }
            }
        }
        double progress = topology.orderedNodes.isEmpty() ? 0.0 : (totalProgressSum / topology.orderedNodes.size());
        if (effectiveStatus == WorkflowStatus.COMPLETED) {
            progress = 100.0;
        }

        AppUser createdBy = w.getCreatedBy();

        return WorkflowSummaryResponse.builder()
                .id(w.getId())
                .name(w.getName())
                .description(w.getDescription())
                .namespaceId(w.getNamespace() != null ? w.getNamespace().getId() : null)
                .namespaceName(w.getNamespace() != null ? w.getNamespace().getName() : null)
                .status(effectiveStatus)
                .pipelineCount(nodes.size())
                .chainCount(topology.chainCount)
                .singleChainReady(topology.singleChainReady)
                .orderedPipelineNames(orderedNames)
                .progress(Math.round(progress * 10.0) / 10.0)
                .ownerName(createdBy != null ? createdBy.getFullName() : "Unknown")
                .ownerInitials(computeInitials(createdBy))
                .ownerColor(createdBy != null ? createdBy.getAvatarColor() : "#4F46E5")
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .build();
    }

    private WorkflowStatus resolveEffectiveStatus(Workflow w, TopologyAnalysis topology) {
        WorkflowStatus status = w.getStatus();
        if (status == WorkflowStatus.RUNNING || status == WorkflowStatus.PAUSED) {
            return status;
        }
        if (!topology.singleChainReady) {
            return WorkflowStatus.DRAFT;
        }
        if (status == WorkflowStatus.DRAFT) {
            return WorkflowStatus.READY;
        }
        return status;
    }

    private String computeInitials(AppUser user) {
        if (user == null || user.getFullName() == null || user.getFullName().isBlank()) {
            return "U";
        }
        String[] parts = user.getFullName().trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, 1).toUpperCase();
        }
        return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
    }

    private String getStringFromMap(Map<Object, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : "—";
    }

    private long getLongFromMap(Map<Object, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return 0L;
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return 0L; }
    }

    private double getDoubleFromMap(Map<Object, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return 0.0;
        try { return Double.parseDouble(v.toString()); } catch (NumberFormatException e) { return 0.0; }
    }
}

