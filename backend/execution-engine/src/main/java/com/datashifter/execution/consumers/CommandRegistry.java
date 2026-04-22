package com.datashifter.execution.consumers;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks pause/stop commands for running pipelines.
 *
 * Extracted from PipelineJobConsumer to break the circular dependency:
 *   PipelineJobConsumer → ExecutionServiceImpl → PipelineJobConsumer
 *
 * Now:
 *   PipelineJobConsumer → CommandRegistry (writes commands)
 *   ExecutionServiceImpl → CommandRegistry (reads commands)
 *   ParallelChunkProcessor → CommandRegistry (reads commands)
 *
 * No cycle.
 */
@Component
@Slf4j
public class CommandRegistry {

    private final Map<String, String> pendingCommands = new ConcurrentHashMap<>();

    public void setCommand(String pipelineId, String command) {
        pendingCommands.put(pipelineId, command);
        log.info("Command registered: {} → {}", pipelineId, command);
    }

    public boolean isPauseRequested(String pipelineId) {
        return "PAUSE".equals(pendingCommands.get(pipelineId));
    }

    public boolean isStopRequested(String pipelineId) {
        return "STOP".equals(pendingCommands.get(pipelineId));
    }

    public void clearCommand(String pipelineId) {
        pendingCommands.remove(pipelineId);
    }
}