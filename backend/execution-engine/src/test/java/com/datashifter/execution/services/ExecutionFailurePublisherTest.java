package com.datashifter.execution.services;

import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.ErrorEvent;
import com.datashifter.common.events.PipelineEvents.StatusChangeEvent;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.common.models.TargetTableMapping;
import com.datashifter.execution.repositories.ExecutionPipelineRepository;
import com.datashifter.execution.services.implementations.ExecutionFailurePublisher;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExecutionFailurePublisherTest {

    @Mock private ExecutionPipelineRepository pipelineRepo;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks
    private ExecutionFailurePublisher failurePublisher;

    @Test
    @DisplayName("Publishes both PIPELINE_STATUS and PIPELINE_ERRORS when pipeline execution fails")
    void testPublishesStatusAndErrorEventsOnFailure() {
        TargetTableMapping ttm = TargetTableMapping.builder().targetTable("PRODUCT_MASTER").build();
        PipelineTable pt = PipelineTable.builder().sourceTable("products").targetTableMappings(java.util.Set.of(ttm)).build();
        Pipeline pipeline = Pipeline.builder().status(PipelineStatus.RUNNING).pipelineTables(java.util.Set.of(pt)).build();
        pipeline.setId("pipe-123");

        DatashifterException ex = new DatashifterException("Adapter \"postgres-reader\" and \"oracle-writer\" is missing. Please install from Marketplace.");

        failurePublisher.handleExecutionFailure("pipe-123", "exec-log-1", pipeline, null, ex);

        assertThat(pipeline.getStatus()).isEqualTo(PipelineStatus.ERRORED);
        verify(pipelineRepo).saveAndFlush(pipeline);

        ArgumentCaptor<StatusChangeEvent> statusCaptor = ArgumentCaptor.forClass(StatusChangeEvent.class);
        verify(kafkaTemplate).send(eq(KafkaTopics.PIPELINE_STATUS), statusCaptor.capture());
        StatusChangeEvent statusEvent = statusCaptor.getValue();
        assertThat(statusEvent.getNewStatus()).isEqualTo(PipelineStatus.ERRORED);
        assertThat(statusEvent.getReason()).contains("Adapter \"postgres-reader\" and \"oracle-writer\" is missing");

        ArgumentCaptor<ErrorEvent> errorCaptor = ArgumentCaptor.forClass(ErrorEvent.class);
        verify(kafkaTemplate).send(eq(KafkaTopics.PIPELINE_ERRORS), errorCaptor.capture());
        ErrorEvent errorEvent = errorCaptor.getValue();
        assertThat(errorEvent.getErrorType()).isEqualTo(ErrorType.ADAPTER_ERROR);
        assertThat(errorEvent.getSourceTable()).isEqualTo("products");
        assertThat(errorEvent.getTargetTable()).isEqualTo("PRODUCT_MASTER");
        assertThat(errorEvent.getErrorMessage()).contains("Adapter \"postgres-reader\" and \"oracle-writer\" is missing");
        assertThat(errorEvent.isPipelineStopped()).isTrue();
    }
}
