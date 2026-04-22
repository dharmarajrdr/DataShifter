package com.datashifter.execution.consumers;

import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.*;
import com.datashifter.execution.services.interfaces.ExecutionService;
import lombok.extern.slf4j.Slf4j;
import com.datashifter.execution.consumers.CommandRegistry;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Kafka consumer for pipeline job events and control commands.
 *
 * Key design decisions:
 *   - Jobs execute ASYNC on a thread pool — Kafka listener thread is not blocked
 *   - Only one execution per pipeline at a time (tracked in activePipelines set)
 *   - Commands (PAUSE/STOP) are stored in a ConcurrentHashMap — the chunk loop polls this
 *   - Thread pool is fixed-size (configurable for Phase 2 parallelism)
 */
@Component
@Slf4j
public class PipelineJobConsumer {

    private final ExecutionService executionService;

    private final CommandRegistry commandRegistry;

    /** Pending commands per pipeline (PAUSE, STOP) */
    private final Map<String, String> pendingCommands = new ConcurrentHashMap<>();

    /** Track which pipelines are currently executing — prevent duplicate runs */
    private final Set<String> activePipelines = ConcurrentHashMap.newKeySet();

    /** Thread pool for async pipeline execution */
    private final ExecutorService executorService;

    public PipelineJobConsumer(ExecutionService executionService, CommandRegistry commandRegistry) {
        this.executionService = executionService;
        this.commandRegistry = commandRegistry;
        // Fixed pool — one pipeline per thread. Size 4 allows 4 concurrent pipelines.
        // In Phase 2, make this configurable via application.properties
        this.executorService = Executors.newFixedThreadPool(4, r -> {
            Thread t = new Thread(r);
            t.setName("pipeline-executor-" + t.getId());
            t.setDaemon(true);
            return t;
        });
    }

    // =========================================================================
    // KAFKA LISTENERS
    // =========================================================================

    @KafkaListener(topics = KafkaTopics.PIPELINE_JOBS, groupId = "execution-engine")
    public void handleJob(PipelineJobEvent event) {
        String pipelineId = event.getPipelineId();

        if (activePipelines.contains(pipelineId)) {
            log.warn("Pipeline {} is already executing — ignoring duplicate job", pipelineId);
            return;
        }

        log.info("Received job: pipeline={}, action={}", pipelineId, event.getAction());

        // Clear any stale commands from previous run
        pendingCommands.remove(pipelineId);

        // Execute async — don't block Kafka listener
        activePipelines.add(pipelineId);
        executorService.submit(() -> {
            try {
                executionService.execute(pipelineId, event.getExecutionLogId());
            } catch (Exception e) {
                log.error("Unhandled exception in pipeline execution {}: {}", pipelineId, e.getMessage(), e);
            } finally {
                activePipelines.remove(pipelineId);
                pendingCommands.remove(pipelineId);
            }
        });
    }

    @KafkaListener(topics = KafkaTopics.PIPELINE_COMMANDS, groupId = "execution-engine")
    public void handleCommand(PipelineCommandEvent event) {
        String pipelineId = event.getPipelineId();
        String command = event.getCommand();

        log.info("Received command: pipeline={}, command={}", pipelineId, command);

        if (!activePipelines.contains(pipelineId)) {
            log.warn("Pipeline {} is not active — command {} ignored", pipelineId, command);
            return;
        }

        commandRegistry.setCommand(pipelineId, "PAUSE");
    }

    // =========================================================================
    // COMMAND POLLING — called by ExecutionServiceImpl in the chunk loop
    // =========================================================================

    public boolean isPauseRequested(String pipelineId) {
        return "PAUSE".equals(pendingCommands.get(pipelineId));
    }

    public boolean isStopRequested(String pipelineId) {
        return "STOP".equals(pendingCommands.get(pipelineId));
    }

    /**
     * Check if any interrupt command (PAUSE or STOP) is pending.
     * Use this for a single check in the chunk loop instead of two separate calls.
     */
    public boolean isInterruptRequested(String pipelineId) {
        return pendingCommands.containsKey(pipelineId);
    }

    public void clearCommand(String pipelineId) {
        pendingCommands.remove(pipelineId);
    }

    // =========================================================================
    // STATUS QUERIES
    // =========================================================================

    public boolean isActive(String pipelineId) {
        return activePipelines.contains(pipelineId);
    }

    public int getActivePipelineCount() {
        return activePipelines.size();
    }
}