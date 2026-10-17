package com.datashifter.pipeline.services;

import com.datashifter.common.dtos.PipelineDtos.*;
import com.datashifter.common.enums.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.repositories.CommonWorkflowNodeRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.services.SubscriptionLimitChecker;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.implementations.EngineLivenessService;
import com.datashifter.pipeline.services.implementations.PipelineServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PipelineServiceEngineOfflineTest {

    @Mock private PipelineRepository repository;
    @Mock private CommonWorkflowNodeRepository workflowNodeRepository;
    @Mock private SubscriptionLimitChecker limitChecker;
    @Mock private EngineLivenessService engineLivenessService;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;
    @InjectMocks private PipelineServiceImpl pipelineService;

    @BeforeEach
    void setUp() {
        UserContext.set(UserContext.Context.builder()
                .orgId("org-1")
                .userId("user-1")
                .permissions(Set.of(Permissions.PIPELINE_RUN))
                .build());
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    @DisplayName("Starting pipeline when engine is offline throws DatashifterException and records error")
    void testStartPipelineEngineOffline() {
        String pipeId = "pipe-123";
        Pipeline pipe = Pipeline.builder().status(PipelineStatus.VALIDATED).build();
        pipe.setId(pipeId);

        when(repository.findById(pipeId)).thenReturn(Optional.of(pipe));
        when(workflowNodeRepository.findByPipelineIdWithWorkflow(pipeId)).thenReturn(Optional.empty());
        when(repository.findByOrgId("org-1")).thenReturn(List.of());
        when(engineLivenessService.isEngineAlive()).thenReturn(false);

        assertThatThrownBy(() -> pipelineService.performAction(pipeId,
                PipelineActionRequest.builder().action(PipelineAction.START).build()))
                .isInstanceOf(DatashifterException.class)
                .hasMessage(EngineLivenessService.OFFLINE_MSG);

        verify(engineLivenessService).handleEngineOffline(pipeId, true);
        verify(kafkaTemplate, never()).send(any(), any());
    }
}
