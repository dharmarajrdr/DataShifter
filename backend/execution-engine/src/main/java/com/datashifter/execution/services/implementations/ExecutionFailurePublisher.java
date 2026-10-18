package com.datashifter.execution.services.implementations;

import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.ErrorEvent;
import com.datashifter.common.events.PipelineEvents.StatusChangeEvent;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.execution.contexts.ExecutionContext;
import com.datashifter.execution.repositories.ExecutionPipelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExecutionFailurePublisher {

    private final ExecutionPipelineRepository pipelineRepo;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void handleExecutionFailure(String pipelineId, String executionLogId,
                                       Pipeline pipeline, ExecutionContext ctx, Exception e) {
        log.error("Pipeline failed: {} — {}", pipelineId, e.getMessage(), e);

        if (pipeline != null) {
            pipeline.setStatus(PipelineStatus.ERRORED);
            pipelineRepo.saveAndFlush(pipeline);
        } else {
            pipelineRepo.findById(pipelineId).ifPresent(p -> {
                p.setStatus(PipelineStatus.ERRORED);
                pipelineRepo.saveAndFlush(p);
            });
        }

        kafkaTemplate.send(KafkaTopics.PIPELINE_STATUS, StatusChangeEvent.builder()
                .pipelineId(pipelineId)
                .executionLogId(ctx != null ? ctx.getExecutionLogId() : executionLogId)
                .previousStatus(PipelineStatus.RUNNING)
                .newStatus(PipelineStatus.ERRORED)
                .reason(e.getMessage())
                .timestamp(Instant.now())
                .build());

        if (ctx == null || ctx.getTotalErrors().get() == 0) {
            String srcTbl = resolveSourceTable(pipeline, ctx);
            String tgtTbl = resolveTargetTable(pipeline, ctx);
            ErrorType errType = resolveErrorType(e);
            long chunk = ctx != null ? ctx.getCurrentChunkNumber() : 0L;

            kafkaTemplate.send(KafkaTopics.PIPELINE_ERRORS, ErrorEvent.builder()
                    .pipelineId(pipelineId)
                    .executionLogId(ctx != null ? ctx.getExecutionLogId() : executionLogId)
                    .errorType(errType)
                    .sourceTable(srcTbl)
                    .targetTable(tgtTbl)
                    .chunkNumber(chunk)
                    .rowNumber(0L)
                    .errorMessage(e.getMessage() != null ? e.getMessage() : "Pipeline execution failed")
                    .pipelineStopped(true)
                    .timestamp(Instant.now())
                    .build());
        }
    }

    private String resolveSourceTable(Pipeline p, ExecutionContext ctx) {
        if (ctx != null && ctx.getCurrentTableName() != null && !ctx.getCurrentTableName().isBlank()) return ctx.getCurrentTableName();
        return (p != null && p.getPipelineTables() != null && !p.getPipelineTables().isEmpty())
                ? p.getPipelineTables().iterator().next().getSourceTable() : "SYSTEM";
    }

    private String resolveTargetTable(Pipeline p, ExecutionContext ctx) {
        if (p != null && p.getPipelineTables() != null && !p.getPipelineTables().isEmpty()) {
            PipelineTable pt = p.getPipelineTables().iterator().next();
            if (pt.getTargetTableMappings() != null && !pt.getTargetTableMappings().isEmpty()) {
                return pt.getTargetTableMappings().iterator().next().getTargetTable();
            }
        }
        return "EXECUTION_ENGINE";
    }

    private ErrorType resolveErrorType(Exception e) {
        String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
        if (msg.contains("adapter")) return ErrorType.ADAPTER_ERROR;
        return (e instanceof DatashifterException) ? ErrorType.CONFIGURATION_ERROR : ErrorType.UNKNOWN;
    }
}

