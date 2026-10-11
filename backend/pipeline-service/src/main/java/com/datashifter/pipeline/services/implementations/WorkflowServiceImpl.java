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
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    // =========================================================================
    // CREATE
    // =========================================================================

    @Override
    @Transactional
    public WorkflowResponse create(CreateWorkflowRequest req) {
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
    public WorkflowResponse update(String id, UpdateWorkflowRequest req) {
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
    public WorkflowResponse saveCanvas(String id, SaveWorkflowCanvasRequest req) {
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
    public WorkflowResponse addPipelines(String id, AddWorkflowPipelinesRequest req) {
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
                    .lastRunOutcome(WorkflowNodeOutcome.PENDING)
                    .build();
            nodeRepository.save(node);
            existingIds.add(pipelineId);
            index++;
        }

        refreshDerivedStatus(workflow);
        workflowRepository.save(workflow);
        return toFullResponse(workflow);
    }

    @Override
    @Transactional
    public WorkflowResponse removePipeline(String id, String pipelineId) {
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
        workflowRepository.save(workflow);
        return toFullResponse(workflow);
    }

    // =========================================================================
    // GET & ELIGIBLE PIPELINES & DELETE
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public WorkflowResponse getById(String id) {
        return toFullResponse(findEntity(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkflowSummaryResponse> getAll() {
        String orgId = UserContext.getCurrentOrgId();
        return workflowRepository.findByOrgIdOrderByCreatedAtDesc(orgId)
                .stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PipelineSummaryResponse> getEligiblePipelines(String workflowId) {
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
    public void delete(String id) {
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
    public WorkflowResponse performAction(String id, WorkflowActionRequest request) {
        Workflow workflow = findEntity(id);
        if (request == null || request.getAction() == null) {
            throw new DatashifterException("Workflow action is required.");
        }

        List<WorkflowNode> nodes = nodeRepository.findByWorkflow_Id(id);
        List<WorkflowEdge> edges = edgeRepository.findByWorkflow_Id(id);
        Map<String, Pipeline> pipelineMap = loadPipelinesMap(nodes);
        TopologyAnalysis topology = analyzeTopology(nodes, edges, pipelineMap);

        switch (request.getAction()) {
            case START -> {
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

                // Reset all member pipelines' checkpoints and outcomes for a clean workflow run
                for (WorkflowNode node : topology.orderedNodes) {
                    Pipeline p = pipelineMap.get(node.getPipelineId());
                    if (p != null) {
                        clearPipelineCheckpoints(p.getId());
                        p.setStatus(PipelineStatus.VALIDATED);
                        pipelineRepository.save(p);
                    }
                    node.setLastRunOutcome(WorkflowNodeOutcome.PENDING);
                    nodeRepository.save(node);
                }

                // Start the head pipeline of the single chain
                WorkflowNode headNode = topology.orderedNodes.get(0);
                Pipeline headPipeline = pipelineMap.get(headNode.getPipelineId());
                if (headPipeline == null) {
                    throw new DatashifterException("Head pipeline not found for workflow.");
                }
                headNode.setLastRunOutcome(WorkflowNodeOutcome.RUNNING);
                nodeRepository.save(headNode);

                headPipeline.setStatus(PipelineStatus.RUNNING);
                pipelineRepository.save(headPipeline);

                workflow.setStatus(WorkflowStatus.RUNNING);
                workflow.setCurrentPipelineId(headPipeline.getId());
                workflowRepository.save(workflow);

                kafkaTemplate.send(KafkaTopics.PIPELINE_JOBS,
                        PipelineJobEvent.builder()
                                .pipelineId(headPipeline.getId())
                                .action("START")
                                .timestamp(Instant.now())
                                .build());

                log.info("Started workflow '{}' ({}) with head pipeline '{}' ({})",
                        workflow.getName(), workflow.getId(), headPipeline.getName(), headPipeline.getId());
            }

            case PAUSE -> {
                UserContext.assertPermission(Permissions.WORKFLOW_PAUSE);
                if (workflow.getStatus() != WorkflowStatus.RUNNING) {
                    throw new DatashifterException("Only a running workflow can be paused.");
                }
                workflow.setStatus(WorkflowStatus.PAUSED);
                workflowRepository.save(workflow);

                String activePipelineId = workflow.getCurrentPipelineId();
                if (activePipelineId != null) {
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

                String activePipelineId = workflow.getCurrentPipelineId();
                if (activePipelineId != null) {
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

                if (activePipelineId != null) {
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

                for (WorkflowNode node : nodes) {
                    if (node.getPipelineId().equals(activePipelineId)) {
                        node.setLastRunOutcome(WorkflowNodeOutcome.STOPPED);
                        nodeRepository.save(node);
                    } else if (node.getLastRunOutcome() == WorkflowNodeOutcome.PENDING
                            || node.getLastRunOutcome() == WorkflowNodeOutcome.RUNNING) {
                        node.setLastRunOutcome(WorkflowNodeOutcome.SKIPPED);
                        nodeRepository.save(node);
                    }
                }
                log.info("Stopped workflow '{}' ({})", workflow.getName(), workflow.getId());
            }
        }

        return toFullResponse(workflow);
    }

    // =========================================================================
    // KAFKA LISTENER — SEQUENTIAL PIPELINE HANDOFF & FAILURE ACTIONS
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

        // Only orchestrate handoff when the workflow is actively RUNNING on this pipeline
        if (workflow.getStatus() != WorkflowStatus.RUNNING) {
            return;
        }
        if (workflow.getCurrentPipelineId() != null && !workflow.getCurrentPipelineId().equals(pipelineId)) {
            log.debug("Ignoring status event for pipeline '{}' as workflow '{}' current pipeline is '{}'",
                    pipelineId, workflow.getId(), workflow.getCurrentPipelineId());
            return;
        }

        List<WorkflowNode> allNodes = nodeRepository.findByWorkflow_Id(workflow.getId());
        List<WorkflowEdge> outgoingEdges = edgeRepository.findByWorkflow_IdAndSourcePipelineId(workflow.getId(), pipelineId);
        Optional<WorkflowEdge> outgoingEdgeOpt = outgoingEdges.stream().findFirst();

        if (newStatus == PipelineStatus.COMPLETED) {
            currentNode.setLastRunOutcome(WorkflowNodeOutcome.COMPLETED);
            nodeRepository.save(currentNode);
            allNodes.stream()
                    .filter(n -> n.getPipelineId().equals(pipelineId))
                    .forEach(n -> n.setLastRunOutcome(WorkflowNodeOutcome.COMPLETED));

            if (outgoingEdgeOpt.isPresent()) {
                String nextPipelineId = outgoingEdgeOpt.get().getTargetPipelineId();
                log.info("Workflow '{}': pipeline '{}' completed. Triggering successor pipeline '{}'.",
                        workflow.getName(), pipelineId, nextPipelineId);
                triggerSuccessorPipeline(workflow, allNodes, nextPipelineId);
            } else {
                // End of chain reached
                boolean anyFailed = allNodes.stream().anyMatch(n ->
                        n.getLastRunOutcome() == WorkflowNodeOutcome.ERRORED
                                || n.getLastRunOutcome() == WorkflowNodeOutcome.STOPPED);
                workflow.setStatus(anyFailed ? WorkflowStatus.FAILED : WorkflowStatus.COMPLETED);
                workflow.setCurrentPipelineId(null);
                workflowRepository.save(workflow);
                log.info("Workflow '{}' finished with status {}", workflow.getName(), workflow.getStatus());
            }
        } else if (newStatus == PipelineStatus.ERRORED) {
            currentNode.setLastRunOutcome(WorkflowNodeOutcome.ERRORED);
            nodeRepository.save(currentNode);
            allNodes.stream()
                    .filter(n -> n.getPipelineId().equals(pipelineId))
                    .forEach(n -> n.setLastRunOutcome(WorkflowNodeOutcome.ERRORED));

            if (outgoingEdgeOpt.isEmpty()) {
                workflow.setStatus(WorkflowStatus.FAILED);
                workflow.setCurrentPipelineId(null);
                workflowRepository.save(workflow);
                log.warn("Workflow '{}' failed at final pipeline '{}'", workflow.getName(), pipelineId);
                return;
            }

            WorkflowEdge edge = outgoingEdgeOpt.get();
            WorkflowFailureAction action = edge.getOnFailureAction() != null
                    ? edge.getOnFailureAction()
                    : WorkflowFailureAction.STOP_WORKFLOW;
            String targetPipelineId = edge.getTargetPipelineId();

            switch (action) {
                case CONTINUE_PIPELINE -> {
                    log.warn("Workflow '{}': pipeline '{}' failed, but edge action is CONTINUE_PIPELINE. Starting '{}'.",
                            workflow.getName(), pipelineId, targetPipelineId);
                    triggerSuccessorPipeline(workflow, allNodes, targetPipelineId);
                }
                case STOP_PIPELINE -> {
                    log.warn("Workflow '{}': pipeline '{}' failed and edge action is STOP_PIPELINE for '{}'.",
                            workflow.getName(), pipelineId, targetPipelineId);
                    allNodes.stream()
                            .filter(n -> n.getPipelineId().equals(targetPipelineId))
                            .findFirst()
                            .ifPresent(stoppedNode -> {
                                stoppedNode.setLastRunOutcome(WorkflowNodeOutcome.STOPPED);
                                nodeRepository.save(stoppedNode);
                            });

                    // Check if the stopped pipeline has a downstream successor in the chain
                    List<WorkflowEdge> nextEdges = edgeRepository.findByWorkflow_IdAndSourcePipelineId(
                            workflow.getId(), targetPipelineId);
                    Optional<WorkflowEdge> nextEdgeOpt = nextEdges.stream().findFirst();
                    if (nextEdgeOpt.isPresent()) {
                        String downstreamPipelineId = nextEdgeOpt.get().getTargetPipelineId();
                        log.info("Workflow '{}': skipping stopped pipeline '{}' and advancing to downstream pipeline '{}'.",
                                workflow.getName(), targetPipelineId, downstreamPipelineId);
                        triggerSuccessorPipeline(workflow, allNodes, downstreamPipelineId);
                    } else {
                        workflow.setStatus(WorkflowStatus.FAILED);
                        workflow.setCurrentPipelineId(null);
                        workflowRepository.save(workflow);
                    }
                }
                case STOP_WORKFLOW -> {
                    log.warn("Workflow '{}': pipeline '{}' failed and edge action is STOP_WORKFLOW. Aborting remaining chain.",
                            workflow.getName(), pipelineId);
                    for (WorkflowNode n : allNodes) {
                        if (n.getLastRunOutcome() == WorkflowNodeOutcome.PENDING) {
                            n.setLastRunOutcome(WorkflowNodeOutcome.SKIPPED);
                            nodeRepository.save(n);
                        }
                    }
                    workflow.setStatus(WorkflowStatus.FAILED);
                    workflow.setCurrentPipelineId(null);
                    workflowRepository.save(workflow);
                }
            }
        }
    }

    private void triggerSuccessorPipeline(Workflow workflow, List<WorkflowNode> allNodes, String nextPipelineId) {
        WorkflowNode nextNode = allNodes.stream()
                .filter(n -> n.getPipelineId().equals(nextPipelineId))
                .findFirst()
                .orElse(null);

        Pipeline nextPipeline = pipelineRepository.findById(nextPipelineId).orElse(null);

        if (nextNode == null || nextPipeline == null) {
            workflow.setStatus(WorkflowStatus.FAILED);
            workflow.setCurrentPipelineId(null);
            workflowRepository.save(workflow);
            return;
        }

        nextNode.setLastRunOutcome(WorkflowNodeOutcome.RUNNING);
        nodeRepository.save(nextNode);

        nextPipeline.setStatus(PipelineStatus.RUNNING);
        pipelineRepository.save(nextPipeline);

        workflow.setCurrentPipelineId(nextPipeline.getId());
        workflowRepository.save(workflow);

        kafkaTemplate.send(KafkaTopics.PIPELINE_JOBS,
                PipelineJobEvent.builder()
                        .pipelineId(nextPipeline.getId())
                        .action("START")
                        .timestamp(Instant.now())
                        .build());
    }

    private void clearPipelineCheckpoints(String pipelineId) {
        entityManager.createQuery("DELETE FROM ChunkCursor c WHERE c.pipelineId = :pipelineId")
                .setParameter("pipelineId", pipelineId)
                .executeUpdate();
        var checkpointKeys = redisTemplate.keys("pipeline:" + pipelineId + ":table:*:checkpoint");
        if (checkpointKeys != null && !checkpointKeys.isEmpty()) {
            redisTemplate.delete(checkpointKeys);
        }
        redisTemplate.delete("pipeline:" + pipelineId + ":stats");
    }

    // =========================================================================
    // CANVAS GRAPH APPLICATION & SERIES TOPOLOGY ANALYSIS
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

        // 2. Validate Series-only (1 -> 1) constraints and cycle-freedom on requested edges
        Map<String, String> nextMap = new HashMap<>();
        Map<String, String> prevMap = new HashMap<>();
        for (WorkflowEdgeInput ei : safeEdges) {
            String src = ei.getSourcePipelineId();
            String tgt = ei.getTargetPipelineId();
            if (src == null || tgt == null || src.equals(tgt)) {
                throw new DatashifterException("Invalid link between pipelines.");
            }
            if (!requestedPipelineIds.contains(src) || !requestedPipelineIds.contains(tgt)) {
                throw new DatashifterException("Cannot link pipelines that are not part of this workflow.");
            }
            if (nextMap.containsKey(src)) {
                throw new DatashifterException("Series connection violation: A pipeline can only have one successor for now.");
            }
            if (prevMap.containsKey(tgt)) {
                throw new DatashifterException("Series connection violation: A pipeline can only have one predecessor for now.");
            }
            nextMap.put(src, tgt);
            prevMap.put(tgt, src);
        }

        // Cycle check
        for (String startId : requestedPipelineIds) {
            Set<String> seen = new HashSet<>();
            String curr = startId;
            while (curr != null) {
                if (!seen.add(curr)) {
                    throw new DatashifterException("Circular pipeline links are not allowed in a workflow.");
                }
                curr = nextMap.get(curr);
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
                        .lastRunOutcome(WorkflowNodeOutcome.PENDING)
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
        for (WorkflowEdgeInput ei : safeEdges) {
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
        workflowRepository.save(workflow);
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

        Map<String, String> nextMap = new HashMap<>();
        Map<String, String> prevMap = new HashMap<>();
        if (edges != null) {
            for (WorkflowEdge e : edges) {
                String src = e.getSourcePipelineId();
                String tgt = e.getTargetPipelineId();
                if (nodeByPid.containsKey(src) && nodeByPid.containsKey(tgt)) {
                    nextMap.put(src, tgt);
                    prevMap.put(tgt, src);
                }
            }
        }

        // Find all chain heads (in-degree == 0), sorted by positionY then createdAt
        List<WorkflowNode> heads = nodes.stream()
                .filter(n -> !prevMap.containsKey(n.getPipelineId()))
                .sorted(Comparator.comparing((WorkflowNode n) -> n.getPositionY() != null ? n.getPositionY() : 0.0)
                        .thenComparing(n -> n.getCreatedAt() != null ? n.getCreatedAt() : Instant.EPOCH))
                .toList();

        res.chainCount = heads.size();
        Set<String> visited = new HashSet<>();

        for (WorkflowNode head : heads) {
            String currPid = head.getPipelineId();
            while (currPid != null && visited.add(currPid)) {
                WorkflowNode currNode = nodeByPid.get(currPid);
                if (currNode != null) {
                    res.orderedNodes.add(currNode);
                }
                currPid = nextMap.get(currPid);
            }
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
                res.validationErrors.add(String.format(
                        "Pipeline '%s' is in %s status and must be VALIDATED before starting the workflow.",
                        p.getName(), p.getStatus()));
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
            if (p.getStatus() == PipelineStatus.COMPLETED || n.getLastRunOutcome() == WorkflowNodeOutcome.COMPLETED) {
                progress = 100.0;
            }
            long rowsProcessed = getLongFromMap(stats, "rowsProcessed");
            long rowsPerSec = getLongFromMap(stats, "rowsPerSec");
            long errorsSkipped = getLongFromMap(stats, "errorsSkipped");
            String eta = getStringFromMap(stats, "eta");

            totalProgressSum += progress;
            totalRowsProcessed += rowsProcessed;
            totalErrorsSkipped += errorsSkipped;

            nodeResponses.add(WorkflowNodeResponse.builder()
                    .id(n.getId())
                    .pipelineId(p.getId())
                    .pipelineName(p.getName())
                    .sourceName(connNames.getOrDefault(p.getSourceConnectionId(), "Source"))
                    .targetName(connNames.getOrDefault(p.getTargetConnectionId(), "Target"))
                    .tableCount(p.getPipelineTables() != null ? p.getPipelineTables().size() : 0)
                    .pipelineStatus(p.getStatus())
                    .lastRunOutcome(n.getLastRunOutcome())
                    .positionX(n.getPositionX())
                    .positionY(n.getPositionY())
                    .progress(progress)
                    .rowsProcessed(rowsProcessed)
                    .rowsPerSec(rowsPerSec)
                    .errorsSkipped(errorsSkipped)
                    .eta(eta)
                    .build());
        }

        double overallProgress = nodeResponses.isEmpty() ? 0.0 : (totalProgressSum / nodeResponses.size());
        if (w.getStatus() == WorkflowStatus.COMPLETED) {
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
                .status(w.getStatus())
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
            if (p.getStatus() == PipelineStatus.COMPLETED || n.getLastRunOutcome() == WorkflowNodeOutcome.COMPLETED) {
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
        if (w.getStatus() == WorkflowStatus.COMPLETED) {
            progress = 100.0;
        }

        AppUser createdBy = w.getCreatedBy();

        return WorkflowSummaryResponse.builder()
                .id(w.getId())
                .name(w.getName())
                .description(w.getDescription())
                .namespaceId(w.getNamespace() != null ? w.getNamespace().getId() : null)
                .namespaceName(w.getNamespace() != null ? w.getNamespace().getName() : null)
                .status(w.getStatus())
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

