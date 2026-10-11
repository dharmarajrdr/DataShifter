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
    @DisplayName("Phase 2: Enforces Series-only connections (rejects 1->2 fan-out and circular links)")
    void enforceSeriesOnlyAndCycleFreeTopology() {
        Workflow wf = buildWorkflow("wf-1", "Series Workflow", WorkflowStatus.DRAFT);
        when(workflowRepository.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));

        List<WorkflowNodeInput> nodes = List.of(
                WorkflowNodeInput.builder().pipelineId("p-1").positionX(100.0).positionY(80.0).build(),
                WorkflowNodeInput.builder().pipelineId("p-2").positionX(100.0).positionY(220.0).build(),
                WorkflowNodeInput.builder().pipelineId("p-3").positionX(260.0).positionY(220.0).build()
        );

        // 1. Fan-out violation: p-1 -> p-2 AND p-1 -> p-3
        SaveWorkflowCanvasRequest fanOutReq = SaveWorkflowCanvasRequest.builder()
                .nodes(nodes)
                .edges(List.of(
                        WorkflowEdgeInput.builder().sourcePipelineId("p-1").targetPipelineId("p-2").build(),
                        WorkflowEdgeInput.builder().sourcePipelineId("p-1").targetPipelineId("p-3").build()
                ))
                .build();

        DatashifterException fanOutEx = assertThrows(DatashifterException.class,
                () -> workflowService.saveCanvas("wf-1", fanOutReq));
        assertTrue(fanOutEx.getMessage().contains("Series connection violation"));

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
        assertEquals(WorkflowNodeOutcome.RUNNING, n1.getLastRunOutcome());

        ArgumentCaptor<PipelineJobEvent> jobCaptor = ArgumentCaptor.forClass(PipelineJobEvent.class);
        verify(kafkaTemplate).send(eq(KafkaTopics.PIPELINE_JOBS), jobCaptor.capture());
        assertEquals("p-1", jobCaptor.getValue().getPipelineId());
        assertEquals("START", jobCaptor.getValue().getAction());

        // 2. Simulate p-1 COMPLETED -> triggers p-2
        when(nodeRepository.findByPipelineIdWithWorkflow("p-1")).thenReturn(Optional.of(n1));
        when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-1", "p-1")).thenReturn(List.of(e12));
        when(pipelineRepository.findById("p-2")).thenReturn(Optional.of(p2));

        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());

        assertEquals(WorkflowNodeOutcome.COMPLETED, n1.getLastRunOutcome());
        assertEquals(WorkflowNodeOutcome.RUNNING, n2.getLastRunOutcome());
        assertEquals("p-2", wf.getCurrentPipelineId());

        // 3. Simulate p-2 COMPLETED -> workflow finishes COMPLETED
        when(nodeRepository.findByPipelineIdWithWorkflow("p-2")).thenReturn(Optional.of(n2));
        when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-1", "p-2")).thenReturn(List.of());

        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-2")
                .newStatus(PipelineStatus.COMPLETED)
                .timestamp(Instant.now())
                .build());

        assertEquals(WorkflowNodeOutcome.COMPLETED, n2.getLastRunOutcome());
        assertEquals(WorkflowStatus.COMPLETED, wf.getStatus());
        assertNull(wf.getCurrentPipelineId());
    }

    @Test
    @DisplayName("Phase 3: Evaluates STOP_WORKFLOW, STOP_PIPELINE, and CONTINUE_PIPELINE on predecessor failure")
    void evaluateFailureActionsOnPredecessorError() {
        Workflow wf = buildWorkflow("wf-1", "Failure Action Workflow", WorkflowStatus.RUNNING);
        Pipeline p2 = buildPipeline("p-2", "Step 2", PipelineStatus.VALIDATED);
        Pipeline p3 = buildPipeline("p-3", "Step 3", PipelineStatus.VALIDATED);

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").lastRunOutcome(WorkflowNodeOutcome.RUNNING).build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").lastRunOutcome(WorkflowNodeOutcome.PENDING).build();
        WorkflowNode n3 = WorkflowNode.builder().workflow(wf).pipelineId("p-3").lastRunOutcome(WorkflowNodeOutcome.PENDING).build();

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
        when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-1", "p-1")).thenReturn(List.of(e12));
        when(edgeRepository.findByWorkflow_IdAndSourcePipelineId("wf-1", "p-2")).thenReturn(List.of(e23));
        when(pipelineRepository.findById("p-3")).thenReturn(Optional.of(p3));

        // Case A: STOP_PIPELINE on p-1 -> p-2 stops p-2 and advances to p-3
        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.ERRORED)
                .timestamp(Instant.now())
                .build());

        assertEquals(WorkflowNodeOutcome.ERRORED, n1.getLastRunOutcome());
        assertEquals(WorkflowNodeOutcome.STOPPED, n2.getLastRunOutcome());
        assertEquals(WorkflowNodeOutcome.RUNNING, n3.getLastRunOutcome());
        assertEquals("p-3", wf.getCurrentPipelineId());

        // Case B: CONTINUE_PIPELINE on p-1 -> p-2 starts p-2 directly
        e12.setOnFailureAction(WorkflowFailureAction.CONTINUE_PIPELINE);
        n2.setLastRunOutcome(WorkflowNodeOutcome.PENDING);
        when(pipelineRepository.findById("p-2")).thenReturn(Optional.of(p2));

        workflowService.handlePipelineStatusChange(StatusChangeEvent.builder()
                .pipelineId("p-1")
                .newStatus(PipelineStatus.ERRORED)
                .timestamp(Instant.now())
                .build());

        assertEquals(WorkflowNodeOutcome.RUNNING, n2.getLastRunOutcome());
        assertEquals("p-2", wf.getCurrentPipelineId());
    }
}
