package com.datashifter.pipeline.services;

import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.dtos.WorkflowDtos.*;
import com.datashifter.common.enums.*;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.PipelineJobEvent;
import com.datashifter.common.events.PipelineEvents.StatusChangeEvent;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.*;
import com.datashifter.common.repositories.CommonWorkflowEdgeRepository;
import com.datashifter.common.repositories.CommonWorkflowNodeRepository;
import com.datashifter.common.repositories.CommonWorkflowRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.services.SubscriptionLimitChecker;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.pipeline.repositories.NamespaceRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.implementations.PipelineServiceImpl;
import com.datashifter.pipeline.services.implementations.WorkflowServiceImpl;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceTest {

    @Mock
    private CommonWorkflowRepository workflowRepository;
    @Mock
    private CommonWorkflowNodeRepository nodeRepository;
    @Mock
    private CommonWorkflowEdgeRepository edgeRepository;
    @Mock
    private PipelineRepository pipelineRepository;
    @Mock
    private NamespaceRepository namespaceRepository;
    @Mock
    private ConnectionRepository connectionRepository;
    @Mock
    private EntityManager entityManager;
    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private HashOperations<String, Object, Object> hashOperations;
    @Mock
    private SubscriptionLimitChecker limitChecker;
    @Mock
    private com.datashifter.pipeline.services.implementations.MappingService mappingService;
    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    @Mock
    private com.datashifter.pipeline.services.implementations.PipelineAdapterValidator pipelineAdapterValidator;

    @InjectMocks
    private WorkflowServiceImpl workflowService;

    @InjectMocks
    private PipelineServiceImpl pipelineService;

    private final String orgId = "org-1";
    private final String userId = "user-1";

    @BeforeEach
    void setUp() {
        UserContext.set(UserContext.Context.builder()
                .orgId(orgId)
                .userId(userId)
                .permissions(Set.of(Permissions.ALL.toArray(new String[0])))
                .build());
        lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        lenient().when(hashOperations.entries(anyString())).thenReturn(Collections.emptyMap());
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    private Pipeline buildPipeline(String id, String name, PipelineStatus status) {
        Pipeline p = Pipeline.builder()
                .name(name)
                .status(status)
                .sourceConnectionId("conn-src")
                .targetConnectionId("conn-tgt")
                .build();
        p.setId(id);
        p.setCreatedAt(Instant.now());
        return p;
    }

    private Workflow buildWorkflow(String id, String name, WorkflowStatus status) {
        Workflow w = Workflow.builder()
                .orgId(orgId)
                .name(name)
                .status(status)
                .build();
        w.setId(id);
        w.setCreatedAt(Instant.now());
        return w;
    }

    @Test
    @DisplayName("Phase 2: Rejects importing a pipeline that is not in VALIDATED status")
    void rejectUnvalidatedPipelineImport() {
        Workflow wf = buildWorkflow("wf-1", "Order Migration", WorkflowStatus.DRAFT);
        Pipeline draftPipeline = buildPipeline("p-draft", "Draft Pipeline", PipelineStatus.DRAFT);

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of());
        when(pipelineRepository.findById("p-draft")).thenReturn(Optional.of(draftPipeline));
        when(nodeRepository.findByPipelineIdWithWorkflow("p-draft")).thenReturn(Optional.empty());

        AddWorkflowPipelinesRequest req = AddWorkflowPipelinesRequest.builder()
                .pipelineIds(List.of("p-draft"))
                .build();

        DatashifterException ex = assertThrows(DatashifterException.class,
                () -> workflowService.addPipelines("wf-1", req));
        assertTrue(ex.getMessage().contains("must be in VALIDATED status"));
    }

    @Test
    @DisplayName("Phase 2: Rejects importing a pipeline that already belongs to another workflow (0-or-1 membership)")
    void rejectPipelineAlreadyInAnotherWorkflow() {
        Workflow wf1 = buildWorkflow("wf-1", "Workflow One", WorkflowStatus.DRAFT);
        Workflow wf2 = buildWorkflow("wf-2", "Workflow Two", WorkflowStatus.READY);
        Pipeline p1 = buildPipeline("p-1", "Shared Pipeline", PipelineStatus.VALIDATED);
        WorkflowNode existingNode = WorkflowNode.builder()
                .workflow(wf2)
                .pipelineId("p-1")
                .build();

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf1));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of());
        when(pipelineRepository.findById("p-1")).thenReturn(Optional.of(p1));
        when(nodeRepository.findByPipelineIdWithWorkflow("p-1")).thenReturn(Optional.of(existingNode));

        AddWorkflowPipelinesRequest req = AddWorkflowPipelinesRequest.builder()
                .pipelineIds(List.of("p-1"))
                .build();

        DatashifterException ex = assertThrows(DatashifterException.class,
                () -> workflowService.addPipelines("wf-1", req));
        assertTrue(ex.getMessage().contains("already belongs to workflow 'Workflow Two'"));
    }

    @Test
    @DisplayName("Phase 2: Allows parallel fan-out and fan-in DAG connections while rejecting circular links")
    void allowParallelDagAndRejectCircularLinks() {
        Workflow wf = buildWorkflow("wf-1", "Parallel DAG Workflow", WorkflowStatus.DRAFT);
        Pipeline p1 = buildPipeline("p-1", "Step 1", PipelineStatus.VALIDATED);
        Pipeline p2 = buildPipeline("p-2", "Step 2A", PipelineStatus.VALIDATED);
        Pipeline p3 = buildPipeline("p-3", "Step 2B", PipelineStatus.VALIDATED);
        Pipeline p4 = buildPipeline("p-4", "Step 3 Join", PipelineStatus.VALIDATED);

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        lenient().when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of());
        lenient().when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of());
        lenient().when(pipelineRepository.findById("p-1")).thenReturn(Optional.of(p1));
        lenient().when(pipelineRepository.findById("p-2")).thenReturn(Optional.of(p2));
        lenient().when(pipelineRepository.findById("p-3")).thenReturn(Optional.of(p3));
        lenient().when(pipelineRepository.findById("p-4")).thenReturn(Optional.of(p4));
        lenient().when(nodeRepository.findByPipelineIdWithWorkflow(anyString())).thenReturn(Optional.empty());

        List<WorkflowNodeInput> nodes = List.of(
                WorkflowNodeInput.builder().pipelineId("p-1").positionX(260.0).positionY(80.0).build(),
                WorkflowNodeInput.builder().pipelineId("p-2").positionX(100.0).positionY(220.0).build(),
                WorkflowNodeInput.builder().pipelineId("p-3").positionX(420.0).positionY(220.0).build(),
                WorkflowNodeInput.builder().pipelineId("p-4").positionX(260.0).positionY(360.0).build()
        );

        // 1. Parallel Fan-out (p-1 -> p-2, p-1 -> p-3) and Fan-in Join (p-2 -> p-4, p-3 -> p-4) is allowed
        SaveWorkflowCanvasRequest parallelDagReq = SaveWorkflowCanvasRequest.builder()
                .nodes(nodes)
                .edges(List.of(
                        WorkflowEdgeInput.builder().sourcePipelineId("p-1").targetPipelineId("p-2").build(),
                        WorkflowEdgeInput.builder().sourcePipelineId("p-1").targetPipelineId("p-3").build(),
                        WorkflowEdgeInput.builder().sourcePipelineId("p-2").targetPipelineId("p-4").build(),
                        WorkflowEdgeInput.builder().sourcePipelineId("p-3").targetPipelineId("p-4").build()
                ))
                .build();

        assertDoesNotThrow(() -> workflowService.saveCanvas("wf-1", parallelDagReq));

        // 2. Cycle violation: p-1 -> p-2 -> p-1
        SaveWorkflowCanvasRequest cycleReq = SaveWorkflowCanvasRequest.builder()
                .nodes(nodes.subList(0, 2))
                .edges(List.of(
                        WorkflowEdgeInput.builder().sourcePipelineId("p-1").targetPipelineId("p-2").build(),
                        WorkflowEdgeInput.builder().sourcePipelineId("p-2").targetPipelineId("p-1").build()
                ))
                .build();

        DatashifterException cycleEx = assertThrows(DatashifterException.class,
                () -> workflowService.saveCanvas("wf-1", cycleReq));
        assertTrue(cycleEx.getMessage().contains("Circular pipeline links are not allowed"));
    }

    @Test
    @DisplayName("Phase 2: Blocks deleting or standalone running a pipeline that belongs to a workflow")
    void blockDeleteAndStandaloneRunWhenLockedToWorkflow() {
        Workflow wf = buildWorkflow("wf-1", "Parent Workflow", WorkflowStatus.READY);
        Pipeline p1 = buildPipeline("p-1", "Locked Pipeline", PipelineStatus.VALIDATED);
        WorkflowNode node = WorkflowNode.builder().workflow(wf).pipelineId("p-1").build();

        when(pipelineRepository.findById("p-1")).thenReturn(Optional.of(p1));
        when(nodeRepository.findByPipelineIdWithWorkflow("p-1")).thenReturn(Optional.of(node));

        // 1. Block delete
        DatashifterException deleteEx = assertThrows(DatashifterException.class,
                () -> pipelineService.delete("p-1"));
        assertTrue(deleteEx.getMessage().contains("linked to workflow 'Parent Workflow'"));

        // 2. Block standalone START
        PipelineActionRequest startReq = new PipelineActionRequest();
        startReq.setAction(PipelineAction.START);
        DatashifterException startEx = assertThrows(DatashifterException.class,
                () -> pipelineService.performAction("p-1", startReq));
        assertTrue(startEx.getMessage().contains("locked to workflow 'Parent Workflow'"));
    }

    @Test
    @DisplayName("Phase 3: Blocks starting a workflow when there are multiple disconnected chains")
    void blockStartWhenMultipleChainsExist() {
        Workflow wf = buildWorkflow("wf-1", "Multi Chain Workflow", WorkflowStatus.DRAFT);
        Pipeline p1 = buildPipeline("p-1", "Pipeline 1", PipelineStatus.VALIDATED);
        Pipeline p2 = buildPipeline("p-2", "Pipeline 2", PipelineStatus.VALIDATED);
        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").positionY(80.0).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").positionY(220.0).build();

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2));
        when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of()); // 0 edges -> 2 disconnected chains
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1, p2));

        WorkflowActionRequest startReq = WorkflowActionRequest.builder()
                .action(WorkflowAction.START)
                .build();

        DatashifterException ex = assertThrows(DatashifterException.class,
                () -> workflowService.performAction("wf-1", startReq));
        assertTrue(ex.getMessage().contains("only one connected chain of pipelines (currently 2 chains)"));
    }

    @Test
    @DisplayName("Phase 3: Starts head pipeline on single valid chain and hands off to successor on COMPLETED")
    void startAndSequentialHandoffOnCompleted() {
        Workflow wf = buildWorkflow("wf-1", "Sequential Workflow", WorkflowStatus.READY);
        Pipeline p1 = buildPipeline("p-1", "Parent Table Migration", PipelineStatus.VALIDATED);
        Pipeline p2 = buildPipeline("p-2", "Child Table Migration", PipelineStatus.VALIDATED);

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").positionY(80.0).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").positionY(220.0).build();
        WorkflowEdge e12 = WorkflowEdge.builder()
                .workflow(wf)
                .sourcePipelineId("p-1")
                .targetPipelineId("p-2")
                .onFailureAction(WorkflowFailureAction.STOP_WORKFLOW)
                .build();

        Query mockQuery = mock(Query.class);
        when(entityManager.createQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2));
        when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(e12));
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1, p2));
        when(pipelineRepository.findByOrgId(orgId)).thenReturn(List.of(p1, p2));

        // 1. Start workflow -> starts head pipeline p-1
        WorkflowActionRequest startReq = WorkflowActionRequest.builder().action(WorkflowAction.START).build();
        workflowService.performAction("wf-1", startReq);

        assertEquals(WorkflowStatus.RUNNING, wf.getStatus());
        assertEquals("p-1", wf.getCurrentPipelineId());
        assertEquals(PipelineStatus.RUNNING, p1.getStatus());

        ArgumentCaptor<PipelineJobEvent> jobCaptor = ArgumentCaptor.forClass(PipelineJobEvent.class);
        verify(kafkaTemplate).send(eq(KafkaTopics.PIPELINE_JOBS), jobCaptor.capture());
        assertEquals("p-1", jobCaptor.getValue().getPipelineId());
        assertEquals("START", jobCaptor.getValue().getAction());

        // 2. Simulate p-1 COMPLETED -> triggers p-2
        when(nodeRepository.findByPipelineIdWithWorkflow("p-1")).thenReturn(Optional.of(n1));
        when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-1", "p-1")).thenReturn(List.of(e12));
        when(pipelineRepository.findById("p-1")).thenReturn(Optional.of(p1));
        when(pipelineRepository.findById("p-2")).thenReturn(Optional.of(p2));

        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());

        assertEquals(PipelineStatus.COMPLETED, p1.getStatus());
        assertEquals(PipelineStatus.RUNNING, p2.getStatus());
        assertEquals("p-2", wf.getCurrentPipelineId());

        // 3. Simulate p-2 COMPLETED -> workflow finishes COMPLETED
        when(nodeRepository.findByPipelineIdWithWorkflow("p-2")).thenReturn(Optional.of(n2));
        when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-1", "p-2")).thenReturn(List.of());

        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-2")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());

        assertEquals(PipelineStatus.COMPLETED, p2.getStatus());
        assertEquals(WorkflowStatus.COMPLETED, wf.getStatus());
        assertNull(wf.getCurrentPipelineId());
    }

    @Test
    @DisplayName("Phase 3: Evaluates STOP_WORKFLOW, STOP_PIPELINE, and CONTINUE_PIPELINE on predecessor failure")
    void evaluateFailureActionsOnPredecessorError() {
        Workflow wf = buildWorkflow("wf-1", "Failure Action Workflow", WorkflowStatus.RUNNING);
        Pipeline p1 = buildPipeline("p-1", "Step 1", PipelineStatus.RUNNING);
        Pipeline p2 = buildPipeline("p-2", "Step 2", PipelineStatus.VALIDATED);
        Pipeline p3 = buildPipeline("p-3", "Step 3", PipelineStatus.VALIDATED);

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").build();
        WorkflowNode n3 = WorkflowNode.builder().workflow(wf).pipelineId("p-3").build();

        WorkflowEdge e12 = WorkflowEdge.builder()
                .workflow(wf)
                .sourcePipelineId("p-1")
                .targetPipelineId("p-2")
                .onFailureAction(WorkflowFailureAction.STOP_PIPELINE)
                .build();
        WorkflowEdge e23 = WorkflowEdge.builder()
                .workflow(wf)
                .sourcePipelineId("p-2")
                .targetPipelineId("p-3")
                .onFailureAction(WorkflowFailureAction.STOP_WORKFLOW)
                .build();

        when(nodeRepository.findByPipelineIdWithWorkflow("p-1")).thenReturn(Optional.of(n1));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2, n3));
        when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(e12, e23));
        lenient().when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-1", "p-1")).thenReturn(List.of(e12));
        lenient().when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-1", "p-2")).thenReturn(List.of(e23));
        when(pipelineRepository.findById("p-1")).thenReturn(Optional.of(p1));
        lenient().when(pipelineRepository.findById("p-2")).thenReturn(Optional.of(p2));
        lenient().when(pipelineRepository.findById("p-3")).thenReturn(Optional.of(p3));
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1, p2, p3));

        // Case A: STOP_PIPELINE on p-1 -> p-2 stops p-2 and advances to p-3
        wf.setCurrentPipelineId("p-1");
        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.ERRORED)
                .timestamp(Instant.now())
                .build());

        assertEquals(PipelineStatus.ERRORED, p1.getStatus());
        assertEquals(PipelineStatus.ERRORED, p2.getStatus());
        assertEquals(PipelineStatus.RUNNING, p3.getStatus());
        assertEquals("p-3", wf.getCurrentPipelineId());

        // Case B: CONTINUE_PIPELINE on p-1 -> p-2 starts p-2 directly
        wf.setStatus(WorkflowStatus.RUNNING);
        wf.setCurrentPipelineId("p-1");
        e12.setOnFailureAction(WorkflowFailureAction.CONTINUE_PIPELINE);
        p2.setStatus(PipelineStatus.VALIDATED);
        p3.setStatus(PipelineStatus.VALIDATED);

        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.ERRORED)
                .timestamp(Instant.now())
                .build());

        assertEquals(PipelineStatus.RUNNING, p2.getStatus());
        assertEquals("p-2", wf.getCurrentPipelineId());

        // Case C: STOP_WORKFLOW on p-1 -> p-2 halts entire workflow
        wf.setStatus(WorkflowStatus.RUNNING);
        wf.setCurrentPipelineId("p-1");
        e12.setOnFailureAction(WorkflowFailureAction.STOP_WORKFLOW);
        p2.setStatus(PipelineStatus.VALIDATED);
        p3.setStatus(PipelineStatus.VALIDATED);

        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.ERRORED)
                .timestamp(Instant.now())
                .build());

        assertEquals(WorkflowStatus.FAILED, wf.getStatus());
        assertNull(wf.getCurrentPipelineId());
        assertEquals(PipelineStatus.VALIDATED, p2.getStatus());
        assertEquals(PipelineStatus.VALIDATED, p3.getStatus());
    }

    @Test
    @DisplayName("Phase 3: Supports PAUSE, RESUME, and STOP actions on an active workflow")
    void pauseResumeAndStopWorkflow() {
        Workflow wf = buildWorkflow("wf-1", "Controllable Workflow", WorkflowStatus.RUNNING);
        wf.setCurrentPipelineId("p-1");
        Pipeline p1 = buildPipeline("p-1", "Step 1", PipelineStatus.RUNNING);
        Pipeline p2 = buildPipeline("p-2", "Step 2", PipelineStatus.VALIDATED);
        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").positionY(80.0).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").positionY(220.0).build();
        WorkflowEdge e12 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-1").targetPipelineId("p-2").build();

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2));
        when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(e12));
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1, p2));
        lenient().when(pipelineRepository.findById("p-1")).thenReturn(Optional.of(p1));

        // 1. PAUSE
        workflowService.performAction("wf-1", WorkflowActionRequest.builder().action(WorkflowAction.PAUSE).build());
        assertEquals(WorkflowStatus.PAUSED, wf.getStatus());
        assertEquals(PipelineStatus.PAUSED, p1.getStatus());

        // 2. RESUME
        workflowService.performAction("wf-1", WorkflowActionRequest.builder().action(WorkflowAction.RESUME).build());
        assertEquals(WorkflowStatus.RUNNING, wf.getStatus());
        assertEquals(PipelineStatus.RUNNING, p1.getStatus());

        // 3. STOP
        workflowService.performAction("wf-1", WorkflowActionRequest.builder().action(WorkflowAction.STOP).build());
        assertEquals(WorkflowStatus.STOPPED, wf.getStatus());
        assertNull(wf.getCurrentPipelineId());
        assertEquals(PipelineStatus.ERRORED, p1.getStatus());
        assertEquals(PipelineStatus.VALIDATED, p2.getStatus());
    }

    @Test
    @DisplayName("Phase 4: RERUN_FAILED_STAGE preserves COMPLETED stages and restarts the failed stage from scratch")
    void rerunFailedStagePreservesCompletedAndRestartsFailedStage() {
        Workflow wf = buildWorkflow("wf-1", "Rerun Failed Stage Workflow", WorkflowStatus.FAILED);
        Pipeline p1 = buildPipeline("p-1", "Stage 1", PipelineStatus.COMPLETED);
        Pipeline p2 = buildPipeline("p-2", "Stage 2", PipelineStatus.ERRORED);
        Pipeline p3 = buildPipeline("p-3", "Stage 3", PipelineStatus.VALIDATED);

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").positionY(80.0).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").positionY(220.0).build();
        WorkflowNode n3 = WorkflowNode.builder().workflow(wf).pipelineId("p-3").positionY(360.0).build();

        WorkflowEdge e12 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-1").targetPipelineId("p-2").build();
        WorkflowEdge e23 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-2").targetPipelineId("p-3").build();

        Query mockQuery = mock(Query.class);
        when(entityManager.createQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2, n3));
        when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(e12, e23));
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1, p2, p3));
        when(pipelineRepository.findByOrgId(orgId)).thenReturn(List.of(p1, p2, p3));

        workflowService.performAction("wf-1", WorkflowActionRequest.builder()
                .action(WorkflowAction.RERUN_FAILED_STAGE)
                .build());

        assertEquals(WorkflowStatus.RUNNING, wf.getStatus());
        assertEquals("p-2", wf.getCurrentPipelineId());
        assertEquals(PipelineStatus.COMPLETED, p1.getStatus(), "Completed stage p-1 must remain COMPLETED");
        assertEquals(PipelineStatus.RUNNING, p2.getStatus(), "Failed stage p-2 must transition to RUNNING");
        assertEquals(PipelineStatus.VALIDATED, p3.getStatus(), "Downstream stage p-3 must be VALIDATED");

        ArgumentCaptor<PipelineJobEvent> jobCaptor = ArgumentCaptor.forClass(PipelineJobEvent.class);
        verify(kafkaTemplate).send(eq(KafkaTopics.PIPELINE_JOBS), jobCaptor.capture());
        assertEquals("p-2", jobCaptor.getValue().getPipelineId());
        assertEquals("START", jobCaptor.getValue().getAction());
    }

    @Test
    @DisplayName("Phase 4: RERUN_FROM_CHECKPOINT preserves COMPLETED stages and dispatches RETRY on the failed stage")
    void rerunFromCheckpointDispatchesRetryOnFailedStage() {
        Workflow wf = buildWorkflow("wf-1", "Rerun Checkpoint Workflow", WorkflowStatus.FAILED);
        Pipeline p1 = buildPipeline("p-1", "Stage 1", PipelineStatus.COMPLETED);
        Pipeline p2 = buildPipeline("p-2", "Stage 2", PipelineStatus.ERRORED);
        Pipeline p3 = buildPipeline("p-3", "Stage 3", PipelineStatus.ERRORED);

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").positionY(80.0).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").positionY(220.0).build();
        WorkflowNode n3 = WorkflowNode.builder().workflow(wf).pipelineId("p-3").positionY(360.0).build();

        WorkflowEdge e12 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-1").targetPipelineId("p-2").build();
        WorkflowEdge e23 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-2").targetPipelineId("p-3").build();

        Query mockQuery = mock(Query.class);
        when(entityManager.createQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2, n3));
        when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(e12, e23));
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1, p2, p3));
        when(pipelineRepository.findByOrgId(orgId)).thenReturn(List.of(p1, p2, p3));

        workflowService.performAction("wf-1", WorkflowActionRequest.builder()
                .action(WorkflowAction.RERUN_FROM_CHECKPOINT)
                .build());

        assertEquals(WorkflowStatus.RUNNING, wf.getStatus());
        assertEquals("p-2", wf.getCurrentPipelineId());
        assertEquals(PipelineStatus.COMPLETED, p1.getStatus());
        assertEquals(PipelineStatus.RUNNING, p2.getStatus());
        assertEquals(PipelineStatus.VALIDATED, p3.getStatus(), "Downstream stage p-3 must be reset to VALIDATED");

        ArgumentCaptor<PipelineJobEvent> jobCaptor = ArgumentCaptor.forClass(PipelineJobEvent.class);
        verify(kafkaTemplate).send(eq(KafkaTopics.PIPELINE_JOBS), jobCaptor.capture());
        assertEquals("p-2", jobCaptor.getValue().getPipelineId());
        assertEquals("RESUME", jobCaptor.getValue().getAction());
    }

    @Test
    @DisplayName("Phase 5: Parallel fan-out triggers sibling branches concurrently and fan-in join waits for all predecessors")
    void parallelFanOutAndFanInJoinExecution() {
        Workflow wf = buildWorkflow("wf-1", "Diamond Parallel Workflow", WorkflowStatus.READY);
        Pipeline p1 = buildPipeline("p-1", "Root Step", PipelineStatus.VALIDATED);
        Pipeline p2 = buildPipeline("p-2", "Parallel Branch A", PipelineStatus.VALIDATED);
        Pipeline p3 = buildPipeline("p-3", "Parallel Branch B", PipelineStatus.VALIDATED);
        Pipeline p4 = buildPipeline("p-4", "Join Step", PipelineStatus.VALIDATED);

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").positionX(260.0).positionY(80.0).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").positionX(100.0).positionY(220.0).build();
        WorkflowNode n3 = WorkflowNode.builder().workflow(wf).pipelineId("p-3").positionX(420.0).positionY(220.0).build();
        WorkflowNode n4 = WorkflowNode.builder().workflow(wf).pipelineId("p-4").positionX(260.0).positionY(360.0).build();

        WorkflowEdge e12 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-1").targetPipelineId("p-2").onFailureAction(WorkflowFailureAction.STOP_WORKFLOW).build();
        WorkflowEdge e13 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-1").targetPipelineId("p-3").onFailureAction(WorkflowFailureAction.STOP_WORKFLOW).build();
        WorkflowEdge e24 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-2").targetPipelineId("p-4").onFailureAction(WorkflowFailureAction.STOP_WORKFLOW).build();
        WorkflowEdge e34 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-3").targetPipelineId("p-4").onFailureAction(WorkflowFailureAction.STOP_WORKFLOW).build();

        Query mockQuery = mock(Query.class);
        when(entityManager.createQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2, n3, n4));
        when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(e12, e13, e24, e34));
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1, p2, p3, p4));
        when(pipelineRepository.findByOrgId(orgId)).thenReturn(List.of(p1, p2, p3, p4));
        lenient().when(pipelineRepository.findById("p-1")).thenReturn(Optional.of(p1));
        lenient().when(pipelineRepository.findById("p-2")).thenReturn(Optional.of(p2));
        lenient().when(pipelineRepository.findById("p-3")).thenReturn(Optional.of(p3));
        lenient().when(pipelineRepository.findById("p-4")).thenReturn(Optional.of(p4));
        lenient().when(nodeRepository.findByPipelineIdWithWorkflow("p-1")).thenReturn(Optional.of(n1));
        lenient().when(nodeRepository.findByPipelineIdWithWorkflow("p-2")).thenReturn(Optional.of(n2));
        lenient().when(nodeRepository.findByPipelineIdWithWorkflow("p-3")).thenReturn(Optional.of(n3));
        lenient().when(nodeRepository.findByPipelineIdWithWorkflow("p-4")).thenReturn(Optional.of(n4));

        // 1. Start workflow -> starts only root p-1
        workflowService.performAction("wf-1", WorkflowActionRequest.builder().action(WorkflowAction.START).build());
        assertEquals(PipelineStatus.RUNNING, p1.getStatus());
        assertEquals(PipelineStatus.VALIDATED, p2.getStatus());
        assertEquals(PipelineStatus.VALIDATED, p3.getStatus());

        // 2. Root p-1 completes -> triggers BOTH p-2 and p-3 in parallel!
        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());
        assertEquals(PipelineStatus.COMPLETED, p1.getStatus());
        assertEquals(PipelineStatus.RUNNING, p2.getStatus(), "Branch A must start in parallel");
        assertEquals(PipelineStatus.RUNNING, p3.getStatus(), "Branch B must start in parallel");
        assertEquals(PipelineStatus.VALIDATED, p4.getStatus(), "Join step p-4 must wait");

        // 3. Branch A (p-2) completes while Branch B (p-3) is still RUNNING -> p-4 must NOT start yet
        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-2")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());
        assertEquals(PipelineStatus.COMPLETED, p2.getStatus());
        assertEquals(PipelineStatus.RUNNING, p3.getStatus());
        assertEquals(PipelineStatus.VALIDATED, p4.getStatus(), "Join step p-4 must still wait for p-3");
        assertEquals(WorkflowStatus.RUNNING, wf.getStatus());

        // 4. Branch B (p-3) completes -> now all predecessors of p-4 are COMPLETED -> p-4 starts!
        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-3")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());
        assertEquals(PipelineStatus.COMPLETED, p3.getStatus());
        assertEquals(PipelineStatus.RUNNING, p4.getStatus(), "Join step p-4 must start once both p-2 and p-3 complete");

        // 5. Join step p-4 completes -> workflow completes
        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-4")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());
        assertEquals(PipelineStatus.COMPLETED, p4.getStatus());
        assertEquals(WorkflowStatus.COMPLETED, wf.getStatus());
    }

    @Test
    @DisplayName("Phase 5: Parallel RERUN_FAILED_STAGE re-runs only the failed parallel branch while preserving completed sibling")
    void parallelRerunFailedStageReRunsOnlyFailedBranch() {
        Workflow wf = buildWorkflow("wf-1", "Parallel Rerun Workflow", WorkflowStatus.FAILED);
        Pipeline p1 = buildPipeline("p-1", "Root Step", PipelineStatus.COMPLETED);
        Pipeline p2 = buildPipeline("p-2", "Completed Sibling Branch", PipelineStatus.COMPLETED);
        Pipeline p3 = buildPipeline("p-3", "Failed Sibling Branch", PipelineStatus.ERRORED);
        Pipeline p4 = buildPipeline("p-4", "Join Step", PipelineStatus.VALIDATED);

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").positionX(260.0).positionY(80.0).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").positionX(100.0).positionY(220.0).build();
        WorkflowNode n3 = WorkflowNode.builder().workflow(wf).pipelineId("p-3").positionX(420.0).positionY(220.0).build();
        WorkflowNode n4 = WorkflowNode.builder().workflow(wf).pipelineId("p-4").positionX(260.0).positionY(360.0).build();

        WorkflowEdge e12 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-1").targetPipelineId("p-2").build();
        WorkflowEdge e13 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-1").targetPipelineId("p-3").build();
        WorkflowEdge e24 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-2").targetPipelineId("p-4").build();
        WorkflowEdge e34 = WorkflowEdge.builder().workflow(wf).sourcePipelineId("p-3").targetPipelineId("p-4").build();

        Query mockQuery = mock(Query.class);
        when(entityManager.createQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);

        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2, n3, n4));
        when(edgeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(e12, e13, e24, e34));
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1, p2, p3, p4));
        when(pipelineRepository.findByOrgId(orgId)).thenReturn(List.of(p1, p2, p3, p4));

        workflowService.performAction("wf-1", WorkflowActionRequest.builder()
                .action(WorkflowAction.RERUN_FAILED_STAGE)
                .build());

        assertEquals(WorkflowStatus.RUNNING, wf.getStatus());
        assertEquals(PipelineStatus.COMPLETED, p1.getStatus(), "Root p-1 must remain COMPLETED");
        assertEquals(PipelineStatus.COMPLETED, p2.getStatus(), "Completed sibling p-2 must remain COMPLETED");
        assertEquals(PipelineStatus.RUNNING, p3.getStatus(), "Only failed branch p-3 must be restarted");
        assertEquals(PipelineStatus.VALIDATED, p4.getStatus(), "Downstream join p-4 must remain VALIDATED");
    }

    @Test
    @DisplayName("Phase 5: Automatically hands off from Batch migration to continuous CDC pipeline and injects snapshot SCN")
    void startAndHandoffToCdcWithSnapshotScnPropagation() {
        Workflow wf = buildWorkflow("wf-cdc-1", "Batch to CDC Workflow", WorkflowStatus.READY);
        Pipeline p1Batch = buildPipeline("p-1", "Oracle Initial Migration", PipelineStatus.VALIDATED);
        p1Batch.setPipelineMode(PipelineMode.BATCH);
        p1Batch.setCdcStartingScn("2489104250"); // SCN captured during initial migration chunking

        Pipeline p2Cdc = buildPipeline("p-2", "Oracle CDC Continuous Sync", PipelineStatus.VALIDATED);
        p2Cdc.setPipelineMode(PipelineMode.CDC);
        p2Cdc.setCdcDirectoryPath("/u01/app/oracle/dirdat");
        p2Cdc.setCdcFilePattern("aa.*");
        p2Cdc.setCdcStartingScn(null); // Unset, must be injected by hand-off

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").positionY(80.0).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").positionY(220.0).build();
        WorkflowEdge e12 = WorkflowEdge.builder()
                .workflow(wf)
                .sourcePipelineId("p-1")
                .targetPipelineId("p-2")
                .onFailureAction(WorkflowFailureAction.STOP_WORKFLOW)
                .build();

        Query mockQuery = mock(Query.class);
        when(entityManager.createQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);

        when(workflowRepository.findByIdAndOrgId("wf-cdc-1", orgId)).thenReturn(Optional.of(wf));
        when(nodeRepository.findByWorkflow_Id("wf-cdc-1")).thenReturn(List.of(n1, n2));
        when(edgeRepository.findByWorkflow_Id("wf-cdc-1")).thenReturn(List.of(e12));
        when(pipelineRepository.findAllById(anyList())).thenReturn(List.of(p1Batch, p2Cdc));
        when(pipelineRepository.findByOrgId(orgId)).thenReturn(List.of(p1Batch, p2Cdc));

        // 1. Start workflow -> starts initial batch pipeline p-1
        WorkflowActionRequest startReq = WorkflowActionRequest.builder().action(WorkflowAction.START).build();
        workflowService.performAction("wf-cdc-1", startReq);

        assertEquals(WorkflowStatus.RUNNING, wf.getStatus());
        assertEquals("p-1", wf.getCurrentPipelineId());
        assertEquals(PipelineStatus.RUNNING, p1Batch.getStatus());

        // 2. Initial batch pipeline completes -> triggers downstream CDC pipeline p-2
        when(nodeRepository.findByPipelineIdWithWorkflow("p-1")).thenReturn(Optional.of(n1));
        when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-cdc-1", "p-1")).thenReturn(List.of(e12));
        lenient().when(pipelineRepository.findById("p-1")).thenReturn(Optional.of(p1Batch));
        lenient().when(pipelineRepository.findById("p-2")).thenReturn(Optional.of(p2Cdc));


        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());

        // 3. Verify downstream CDC pipeline received starting SCN from batch pipeline
        assertEquals(PipelineStatus.COMPLETED, p1Batch.getStatus());
        assertEquals(PipelineStatus.RUNNING, p2Cdc.getStatus());
        assertEquals("2489104250", p2Cdc.getCdcStartingScn(), "Downstream CDC pipeline must inherit SCN from upstream batch");
        assertEquals("p-2", wf.getCurrentPipelineId());
        assertEquals(WorkflowStatus.RUNNING, wf.getStatus(), "Workflow must remain RUNNING while CDC pipeline streams");

        ArgumentCaptor<PipelineJobEvent> jobCaptor = ArgumentCaptor.forClass(PipelineJobEvent.class);
        verify(kafkaTemplate, atLeastOnce()).send(eq(KafkaTopics.PIPELINE_JOBS), jobCaptor.capture());
        PipelineJobEvent latestJob = jobCaptor.getAllValues().get(jobCaptor.getAllValues().size() - 1);
        assertEquals("p-2", latestJob.getPipelineId());
        assertEquals("START", latestJob.getAction());
    }

    @Test
    @DisplayName("Bulk validates unvalidated pipelines in a workflow")
    void testValidatePipelines() {
        Workflow workflow = buildWorkflow("wf-1", "ETL Workflow", WorkflowStatus.DRAFT);
        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(workflow));

        Pipeline p1 = buildPipeline("p-1", "Pipe 1", PipelineStatus.NOT_VALIDATED);
        Pipeline p2 = buildPipeline("p-2", "Pipe 2", PipelineStatus.VALIDATED);

        WorkflowNode n1 = WorkflowNode.builder().workflow(workflow).pipelineId("p-1").positionX(0.0).positionY(0.0).build();
        n1.setId("n-1");
        WorkflowNode n2 = WorkflowNode.builder().workflow(workflow).pipelineId("p-2").positionX(100.0).positionY(0.0).build();
        n2.setId("n-2");

        when(nodeRepository.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2));
        when(pipelineRepository.findAllById(List.of("p-1", "p-2"))).thenReturn(List.of(p1, p2));
        when(mappingService.validatePipeline(p1)).thenReturn(Collections.emptyList());
        when(workflowRepository.save(any(Workflow.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WorkflowResponse res = workflowService.validatePipelines("wf-1");

        assertNotNull(res);
        assertEquals(PipelineStatus.VALIDATED, p1.getStatus());
        verify(pipelineRepository).save(p1);
    }
}



