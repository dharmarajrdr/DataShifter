package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.models.Pipeline;
import com.datashifter.pipeline.repositories.PipelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class EngineLivenessWatchdog {

    private final EngineLivenessService engineLivenessService;
    private final PipelineRepository pipelineRepository;

    @Scheduled(fixedRate = 5000)
    public void monitorEngineLiveness() {
        if (engineLivenessService.isEngineAlive()) {
            return;
        }

        List<Pipeline> runningPipelines = pipelineRepository.findByStatus(PipelineStatus.RUNNING);
        if (runningPipelines.isEmpty()) {
            return;
        }

        log.warn("Execution engine is offline! Failing {} running pipeline(s)...", runningPipelines.size());
        for (Pipeline pipeline : runningPipelines) {
            try {
                engineLivenessService.handleEngineOffline(pipeline.getId(), false);
            } catch (Exception ex) {
                log.error("Failed to mark pipeline {} as ERRORED: {}", pipeline.getId(), ex.getMessage());
            }
        }
    }
}
