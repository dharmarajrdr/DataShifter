package com.datashifter.pipeline.services;

import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.models.Pipeline;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.implementations.EngineLivenessService;
import com.datashifter.pipeline.services.implementations.EngineLivenessWatchdog;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EngineLivenessWatchdogTest {

    @Mock private EngineLivenessService engineLivenessService;
    @Mock private PipelineRepository pipelineRepository;

    @InjectMocks private EngineLivenessWatchdog watchdog;

    @Test
    @DisplayName("When engine is alive, watchdog does nothing")
    void testEngineAlive() {
        when(engineLivenessService.isEngineAlive()).thenReturn(true);
        watchdog.monitorEngineLiveness();
        verifyNoInteractions(pipelineRepository);
    }

    @Test
    @DisplayName("When engine is offline, watchdog marks running pipelines as ERRORED")
    void testEngineOfflineMarksRunningPipelines() {
        when(engineLivenessService.isEngineAlive()).thenReturn(false);
        Pipeline p1 = Pipeline.builder().status(PipelineStatus.RUNNING).build();
        p1.setId("pipe-1");
        Pipeline p2 = Pipeline.builder().status(PipelineStatus.RUNNING).build();
        p2.setId("pipe-2");

        when(pipelineRepository.findByStatus(PipelineStatus.RUNNING)).thenReturn(List.of(p1, p2));

        watchdog.monitorEngineLiveness();

        verify(engineLivenessService).handleEngineOffline("pipe-1", false);
        verify(engineLivenessService).handleEngineOffline("pipe-2", false);
    }
}
