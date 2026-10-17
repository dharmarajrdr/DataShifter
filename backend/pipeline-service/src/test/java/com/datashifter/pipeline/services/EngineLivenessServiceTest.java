package com.datashifter.pipeline.services;

import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.models.ErrorLog;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.repositories.CommonErrorLogRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.implementations.EngineLivenessService;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EngineLivenessServiceTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private PipelineRepository pipelineRepository;
    @Mock private CommonErrorLogRepository errorLogRepository;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;
    @Mock private WorkflowService workflowService;

    @InjectMocks private EngineLivenessService engineLivenessService;

    @Test
    @DisplayName("isEngineAlive checks Redis heartbeat key")
    void testIsEngineAlive() {
        when(redisTemplate.hasKey(EngineLivenessService.HEARTBEAT_KEY)).thenReturn(true);
        assertThat(engineLivenessService.isEngineAlive()).isTrue();

        when(redisTemplate.hasKey(EngineLivenessService.HEARTBEAT_KEY)).thenReturn(false);
        assertThat(engineLivenessService.isEngineAlive()).isFalse();
    }

    @Test
    @DisplayName("handleEngineOffline sets status to ERRORED, saves ErrorLog, and sends Kafka events")
    void testHandleEngineOffline() {
        String pipeId = "pipe-1";
        Pipeline pipe = Pipeline.builder().status(PipelineStatus.RUNNING).build();
        pipe.setId(pipeId);

        when(pipelineRepository.findById(pipeId)).thenReturn(Optional.of(pipe));

        engineLivenessService.handleEngineOffline(pipeId, true);

        assertThat(pipe.getStatus()).isEqualTo(PipelineStatus.ERRORED);
        verify(pipelineRepository).save(pipe);
        verify(errorLogRepository).deleteByPipelineId(pipeId);

        ArgumentCaptor<ErrorLog> logCaptor = ArgumentCaptor.forClass(ErrorLog.class);
        verify(errorLogRepository).save(logCaptor.capture());
        ErrorLog errorLog = logCaptor.getValue();
        assertThat(errorLog.getPipelineId()).isEqualTo(pipeId);
        assertThat(errorLog.getErrorType()).isEqualTo(ErrorType.CONNECTION_LOST);
        assertThat(errorLog.getSourceTable()).isEqualTo("SYSTEM");
        assertThat(errorLog.getTargetTable()).isEqualTo("EXECUTION_ENGINE");

        verify(kafkaTemplate).send(eq(KafkaTopics.PIPELINE_STATUS), any());
        verify(kafkaTemplate).send(eq(KafkaTopics.PIPELINE_ERRORS), any());
        verify(workflowService).syncWorkflowStatusForPipeline(pipeId);
    }
}
