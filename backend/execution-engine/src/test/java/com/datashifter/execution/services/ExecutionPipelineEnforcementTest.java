package com.datashifter.execution.services;

import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.PipelineMode;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.StatusChangeEvent;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Connection;
import com.datashifter.common.models.Pipeline;
import com.datashifter.execution.adapters.AdapterEnforcementService;
import com.datashifter.execution.adapters.AdapterExecutionBridge;
import com.datashifter.execution.adapters.AdapterExecutionManager;
import com.datashifter.execution.cdc.CdcStreamExecutor;
import com.datashifter.execution.checkpoint.CheckpointManager;
import com.datashifter.execution.consumers.CommandRegistry;
import com.datashifter.execution.parallel.ParallelChunkProcessor;
import com.datashifter.execution.parallel.ParallelConfig;
import com.datashifter.execution.repositories.ExecutionConnectionRepository;
import com.datashifter.execution.repositories.ExecutionPipelineRepository;
import com.datashifter.execution.parallel.ChunkSizeTuner;
import com.datashifter.execution.services.implementations.ColumnMapperService;
import com.datashifter.execution.services.implementations.ColumnMappingResolver;
import com.datashifter.execution.services.implementations.ExecutionServiceImpl;
import com.datashifter.execution.strategies.transformers.UdfExecutionManager;
import com.datashifter.execution.strategies.writers.WriteStrategyExecutor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExecutionPipelineEnforcementTest {

    @Mock private ExecutionPipelineRepository pipelineRepo;
    @Mock private ExecutionConnectionRepository connectionRepo;
    @Mock private CheckpointManager checkpointManager;
    @Mock private ColumnMapperService columnMapperService;
    @Mock private WriteStrategyExecutor writeStrategyExecutor;
    @Mock private ColumnMappingResolver columnMappingResolver;
    @Mock private CommandRegistry commandRegistry;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;
    @Mock private ObjectMapper objectMapper;
    @Mock private ChunkSizeTuner chunkSizeTuner;
    @Mock private ParallelChunkProcessor parallelChunkProcessor;
    @Mock private ParallelConfig parallelConfig;
    @Mock private UdfExecutionManager udfExecutionManager;
    @Mock private CdcStreamExecutor cdcStreamExecutor;
    @Mock private AdapterExecutionManager adapterExecutionManager;
    @Mock private AdapterExecutionBridge adapterExecutionBridge;
    @Mock private AdapterEnforcementService adapterEnforcementService;
    @Mock private com.datashifter.execution.services.implementations.ExecutionFailurePublisher executionFailurePublisher;

    @InjectMocks
    private ExecutionServiceImpl executionService;

    @Test
    @DisplayName("Execution fails and marks pipeline ERRORED when adapters are missing")
    void testExecutionFailsWhenAdaptersMissing() {
        Pipeline pipeline = Pipeline.builder().status(PipelineStatus.NOT_VALIDATED)
                .pipelineMode(PipelineMode.BATCH).sourceConnectionId("c-src").targetConnectionId("c-tgt").build();
        pipeline.setId("p-1");
        Connection src = Connection.builder().dbType(DatabaseType.POSTGRESQL).build();
        src.setId("c-src");
        Connection tgt = Connection.builder().dbType(DatabaseType.ORACLE).build();
        tgt.setId("c-tgt");

        when(pipelineRepo.findByIdWithFullGraph("p-1")).thenReturn(Optional.of(pipeline));
        when(connectionRepo.findById("c-src")).thenReturn(Optional.of(src));
        when(connectionRepo.findById("c-tgt")).thenReturn(Optional.of(tgt));

        doThrow(new DatashifterException("Adapter \"postgres-reader\" and \"oracle-writer\" is missing. Please install from Marketplace."))
                .when(adapterEnforcementService).enforceAdapters(any(), any(), any(), any(), any());

        executionService.execute("p-1", "log-1");

        verify(executionFailurePublisher).handleExecutionFailure(
                eq("p-1"), eq("log-1"), eq(pipeline), isNull(), any(DatashifterException.class));
    }
}

