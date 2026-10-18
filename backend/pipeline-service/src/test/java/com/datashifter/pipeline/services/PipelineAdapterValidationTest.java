package com.datashifter.pipeline.services;

import com.datashifter.common.enums.*;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.*;
import com.datashifter.common.repositories.*;
import com.datashifter.common.security.UserContext;
import com.datashifter.connector.repositories.ConnectionRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.implementations.PipelineAdapterValidator;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PipelineAdapterValidationTest {
    @Mock private ConnectionRepository connRepo;
    @Mock private PipelineRepository pipeRepo;
    @Mock private CommonErrorLogRepository errRepo;
    @Mock private AdapterDefinitionRepository defRepo;
    @Mock private OrgPurchasedAdapterRepository purchasedRepo;
    @Mock private StringRedisTemplate redis;
    @Mock private HashOperations<String, Object, Object> hashOps;
    @Mock private KafkaTemplate<String, Object> kafka;
    @Mock private WorkflowService workflowService;

    private PipelineAdapterValidator validator;
    private final String orgId = "org-test-123";

    @BeforeEach
    void setUp() {
        UserContext.set(UserContext.Context.builder().orgId(orgId).userId("u1").build());
        validator = new PipelineAdapterValidator(connRepo, pipeRepo, errRepo, defRepo, purchasedRepo, redis, kafka, workflowService, "/tmp/datashifter-test-adapters");
    }

    @AfterEach
    void tearDown() { UserContext.clear(); }

    @Test
    void testMissingAdaptersThrowsAndMarksErrored() {
        Pipeline p = Pipeline.builder().name("Test Pipe").status(PipelineStatus.VALIDATED)
                .sourceAdapterId("postgres-reader").targetAdapterId("oracle-writer").build();
        p.setId("pipe-123");
        when(pipeRepo.findById("pipe-123")).thenReturn(Optional.of(p));
        when(purchasedRepo.isAdapterPurchasedByOrg(orgId, "postgres-reader")).thenReturn(false);
        when(purchasedRepo.isAdapterPurchasedByOrg(orgId, "oracle-writer")).thenReturn(false);
        when(defRepo.findByOrganizationIdAndAdapterKey(orgId, "postgres-reader")).thenReturn(Optional.empty());
        when(defRepo.findByOrganizationIdAndAdapterKey(orgId, "oracle-writer")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> validator.validateAdapters(p))
                .isInstanceOf(DatashifterException.class)
                .hasMessageContaining("Adapter \"postgres-reader\" and \"oracle-writer\" is missing. Please install from Marketplace.");

        assertThat(p.getStatus()).isEqualTo(PipelineStatus.ERRORED);
        verify(pipeRepo).save(p);
        verify(errRepo).save(argThat(log -> log.getErrorType() == ErrorType.ADAPTER_ERROR && log.getErrorMessage().contains("missing")));
        verify(kafka).send(eq(KafkaTopics.PIPELINE_STATUS), any());
        verify(workflowService).syncWorkflowStatusForPipeline("pipe-123");
    }

    @Test
    void testInstalledAdaptersPasses() {
        Pipeline p = Pipeline.builder().name("Test Pipe").status(PipelineStatus.VALIDATED)
                .sourceAdapterId("postgres-reader").targetAdapterId("oracle-writer").build();
        p.setId("pipe-123");
        when(purchasedRepo.isAdapterPurchasedByOrg(orgId, "postgres-reader")).thenReturn(true);
        when(purchasedRepo.isAdapterPurchasedByOrg(orgId, "oracle-writer")).thenReturn(true);

        assertThatCode(() -> validator.validateAdapters(p)).doesNotThrowAnyException();
        verify(pipeRepo, never()).save(any());
        verify(errRepo, never()).save(any());
    }
}
