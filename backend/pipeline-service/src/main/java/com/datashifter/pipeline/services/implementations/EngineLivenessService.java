package com.datashifter.pipeline.services.implementations;

import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.StatusChangeEvent;
import com.datashifter.common.models.ErrorLog;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.repositories.CommonErrorLogRepository;
import com.datashifter.pipeline.repositories.PipelineRepository;
import com.datashifter.pipeline.services.interfaces.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class EngineLivenessService {

    public static final String HEARTBEAT_KEY = "engine:execution-engine:heartbeat";
    public static final String OFFLINE_MSG =
            "Execution engine is offline or unavailable. Please ensure execution-engine service is running.";

    private final StringRedisTemplate redisTemplate;
    private final PipelineRepository pipelineRepository;
    private final CommonErrorLogRepository errorLogRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final WorkflowService workflowService;

    public boolean isEngineAlive() {
        return Boolean.TRUE.equals(redisTemplate.hasKey(HEARTBEAT_KEY));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleEngineOffline(String pipelineId, boolean clearExistingErrors) {
        pipelineRepository.findById(pipelineId).ifPresent(p -> recordEngineOffline(p, clearExistingErrors));
    }

    private void recordEngineOffline(Pipeline pipeline, boolean clearExistingErrors) {
        PipelineStatus prev = pipeline.getStatus();
        pipeline.setStatus(PipelineStatus.ERRORED);
        pipelineRepository.save(pipeline);

        if (clearExistingErrors) {
            errorLogRepository.deleteByPipelineId(pipeline.getId());
        }

        ErrorLog errorLog = ErrorLog.builder()
                .pipelineId(pipeline.getId())
                .errorType(ErrorType.CONNECTION_LOST)
                .sourceTable("SYSTEM")
                .targetTable("EXECUTION_ENGINE")
                .errorMessage(OFFLINE_MSG)
                .chunkNumber(0L)
                .rowNumber(0L)
                .build();
        errorLogRepository.save(errorLog);

        try {
            redisTemplate.opsForHash().put("pipeline:" + pipeline.getId() + ":stats", "errorsSkipped", "1");
        } catch (Exception ex) {
            log.warn("Failed to set errorsSkipped in Redis: {}", ex.getMessage());
        }

        kafkaTemplate.send(KafkaTopics.PIPELINE_STATUS, StatusChangeEvent.builder()
                .pipelineId(pipeline.getId())
                .previousStatus(prev)
                .newStatus(PipelineStatus.ERRORED)
                .reason("Execution engine is offline")
                .timestamp(Instant.now())
                .build());

        workflowService.syncWorkflowStatusForPipeline(pipeline.getId());
        log.warn("Marked pipeline {} as ERRORED due to execution-engine offline", pipeline.getId());
    }
}
