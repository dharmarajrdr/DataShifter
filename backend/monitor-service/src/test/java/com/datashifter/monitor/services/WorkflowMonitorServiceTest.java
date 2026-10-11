package com.datashifter.monitor.services;

import com.datashifter.common.dtos.MonitorDtos.*;
import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.enums.WorkflowStatus;
import com.datashifter.common.models.*;
import com.datashifter.common.repositories.CommonWorkflowNodeRepository;
import com.datashifter.common.repositories.CommonWorkflowRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.monitor.repositories.ErrorLogRepository;
import com.datashifter.monitor.repositories.ExecutionLogRepository;
import com.datashifter.monitor.repositories.PipelineRepository;
import com.datashifter.monitor.services.implementations.MonitorServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowMonitorServiceTest {

    @Mock
    private ExecutionLogRepository executionLogRepo;
    @Mock
    private ErrorLogRepository errorLogRepo;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private HashOperations<String, Object, Object> hashOperations;
    @Mock
    private PipelineRepository pipelineRepo;
    @Mock
    private CommonWorkflowRepository workflowRepo;
    @Mock
    private CommonWorkflowNodeRepository workflowNodeRepo;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private MonitorServiceImpl monitorService;

    private final String orgId = "org-1";

    @BeforeEach
    void setUp() {
        UserContext.set(UserContext.Context.builder()
                .orgId(orgId)
                .userId("user-1")
                .permissions(Set.of("monitor:view", "monitor:view_errors"))
                .build());
        lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        lenient().when(hashOperations.entries(anyString())).thenReturn(Collections.emptyMap());
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    @DisplayName("Phase 4: LiveMonitorResponse includes workflowId and workflowName when pipeline belongs to a workflow")
    void liveMonitorIncludesWorkflowMetadata() {
        Workflow wf = Workflow.builder().orgId(orgId).name("Parent-Child Workflow").status(WorkflowStatus.READY).build();
        wf.setId("wf-1");
        Pipeline p1 = Pipeline.builder().name("Users Migration").status(PipelineStatus.VALIDATED).build();
        p1.setId("p-1");
        WorkflowNode node = WorkflowNode.builder().workflow(wf).pipelineId("p-1").build();

        when(pipelineRepo.findById("p-1")).thenReturn(Optional.of(p1));
        when(workflowNodeRepo.findByPipelineIdWithWorkflow("p-1")).thenReturn(Optional.of(node));

        LiveMonitorResponse res = monitorService.getLiveMonitor("p-1");
        assertEquals("wf-1", res.getWorkflowId());
        assertEquals("Parent-Child Workflow", res.getWorkflowName());
    }

    @Test
    @DisplayName("Phase 4: Aggregates error logs across all member pipelines and supports per-pipeline filtering")
    void aggregateAndFilterWorkflowErrorLogs() {
        Workflow wf = Workflow.builder().orgId(orgId).name("Orders Workflow").status(WorkflowStatus.FAILED).build();
        wf.setId("wf-1");

        Pipeline p1 = Pipeline.builder().name("Customers Pipeline").status(PipelineStatus.COMPLETED).build();
        p1.setId("p-1");
        Pipeline p2 = Pipeline.builder().name("Orders Pipeline").status(PipelineStatus.ERRORED).build();
        p2.setId("p-2");

        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").build();

        ErrorLog err1 = ErrorLog.builder()
                .pipelineId("p-1")
                .errorType(ErrorType.TRANSFORMATION_FAILED)
                .sourceTable("customers")
                .targetTable("customers_dest")
                .chunkNumber(1L)
                .rowNumber(5L)
                .errorMessage("Invalid date format")
                .build();
        err1.setId("err-1");
        err1.setCreatedAt(Instant.now());

        ErrorLog err2 = ErrorLog.builder()
                .pipelineId("p-2")
                .errorType(ErrorType.NULL_CONSTRAINT)
                .sourceTable("orders")
                .targetTable("orders_dest")
                .chunkNumber(2L)
                .rowNumber(14L)
                .errorMessage("Foreign key violation")
                .build();
        err2.setId("err-2");
        err2.setCreatedAt(Instant.now());

        when(workflowRepo.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(workflowNodeRepo.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2));
        when(pipelineRepo.findAllById(List.of("p-1", "p-2"))).thenReturn(List.of(p1, p2));

        // 1. All pipelines (pipelineIdFilter = null)
        when(errorLogRepo.countByPipelineIdIn(List.of("p-1", "p-2"))).thenReturn(2L);
        when(errorLogRepo.countByErrorTypeIn(List.of("p-1", "p-2"))).thenReturn(List.of(
                new Object[]{ErrorType.TRANSFORMATION_FAILED, 1L},
                new Object[]{ErrorType.NULL_CONSTRAINT, 1L}
        ));
        when(errorLogRepo.findByPipelineIdIn(eq(List.of("p-1", "p-2")), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(err2, err1)));

        ErrorSummaryResponse allSummary = monitorService.getWorkflowErrorSummary("wf-1", null, 0, 20);
        assertEquals(2L, allSummary.getTotalErrors());
        assertEquals(2, allSummary.getErrors().size());
        assertEquals("Orders Pipeline", allSummary.getErrors().get(0).getPipelineName());
        assertEquals("Customers Pipeline", allSummary.getErrors().get(1).getPipelineName());

        // 2. Filtered by p-2 only
        when(errorLogRepo.countByPipelineIdIn(List.of("p-2"))).thenReturn(1L);
        when(errorLogRepo.countByErrorTypeIn(List.of("p-2"))).thenReturn(List.<Object[]>of(
                new Object[]{ErrorType.NULL_CONSTRAINT, 1L}
        ));
        when(errorLogRepo.findByPipelineIdIn(eq(List.of("p-2")), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(err2)));

        ErrorSummaryResponse filteredSummary = monitorService.getWorkflowErrorSummary("wf-1", "p-2", 0, 20);
        assertEquals(1L, filteredSummary.getTotalErrors());
        assertEquals(1, filteredSummary.getErrors().size());
        assertEquals("p-2", filteredSummary.getErrors().get(0).getPipelineId());
        assertEquals("Orders Pipeline", filteredSummary.getErrors().get(0).getPipelineName());
    }

    @Test
    @DisplayName("Phase 4: Clears error logs and Redis error counters across all member pipelines in workflow")
    void clearWorkflowErrorsClearsAllMemberPipelines() {
        Workflow wf = Workflow.builder().orgId(orgId).name("Orders Workflow").status(WorkflowStatus.FAILED).build();
        wf.setId("wf-1");
        WorkflowNode n1 = WorkflowNode.builder().workflow(wf).pipelineId("p-1").build();
        WorkflowNode n2 = WorkflowNode.builder().workflow(wf).pipelineId("p-2").build();

        when(workflowRepo.findByIdAndOrgId("wf-1", orgId)).thenReturn(Optional.of(wf));
        when(workflowNodeRepo.findByWorkflow_Id("wf-1")).thenReturn(List.of(n1, n2));

        monitorService.clearWorkflowErrors("wf-1");

        verify(errorLogRepo).deleteByPipelineIdIn(List.of("p-1", "p-2"));
        verify(hashOperations).put("pipeline:p-1:stats", "errorsSkipped", "0");
        verify(hashOperations).put("pipeline:p-2:stats", "errorsSkipped", "0");
    }
}
