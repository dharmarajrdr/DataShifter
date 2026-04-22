package com.datashifter.notification.consumers;

import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.*;
import com.datashifter.notification.models.SseEvent;
import com.datashifter.notification.registry.EventDispatcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Kafka consumer that bridges pipeline events to SSE.
 *
 * <h3>Consumed topics:</h3>
 * <ul>
 *   <li>{@code pipeline-progress} — chunk progress updates → SSE PROGRESS events</li>
 *   <li>{@code pipeline-status} — status changes → SSE STATUS_CHANGE events</li>
 *   <li>{@code pipeline-errors} — error events → SSE ERROR events</li>
 * </ul>
 *
 * <h3>How it works:</h3>
 * 1. Kafka delivers an event (e.g., ProgressEvent)
 * 2. This consumer converts it to a generic SseEvent with channel routing info
 * 3. EventDispatcher pushes the SseEvent to all matching SSE connections
 *
 * <h3>Extending for new event types:</h3>
 * To add a new event source (e.g., audit events from auth-service):
 * 1. Create a new Kafka topic
 * 2. Add a @KafkaListener method here
 * 3. Map the event to an SseEvent with appropriate channel/eventType
 * That's it — the dispatcher and registry handle the rest.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaEventConsumer {

    private final EventDispatcher dispatcher;

    /**
     * Pipeline progress events — emitted every chunk.
     * Routed to: pipeline:{id} (monitor page) + org:{orgId} (dashboard)
     */
    @KafkaListener(topics = KafkaTopics.PIPELINE_PROGRESS, groupId = "notification-service")
    public void handleProgress(ProgressEvent event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("pipelineId", event.getPipelineId());
        payload.put("tableName", event.getTableName());
        payload.put("tableIndex", event.getTableIndex());
        payload.put("totalTables", event.getTotalTables());
        payload.put("chunkNumber", event.getChunkNumber());
        payload.put("rowsProcessedInChunk", event.getRowsProcessedInChunk());
        payload.put("totalRowsProcessed", event.getTotalRowsProcessed());
        payload.put("overallProgress", event.getOverallProgress());
        payload.put("rowsPerSec", event.getRowsPerSec());
        payload.put("avgRowsPerSec", event.getAvgRowsPerSec());
        payload.put("inflightRecords", event.getInflightRecords());
        payload.put("eta", event.getEta() != null ? event.getEta() : "—");

        dispatcher.dispatch(SseEvent.builder()
                .channel("pipeline:" + event.getPipelineId())
                .orgChannel(resolveOrgChannel(event.getPipelineId()))
                .eventType("PROGRESS")
                .payload(payload)
                .timestamp(event.getTimestamp())
                .build());
    }

    /**
     * Pipeline status change events — emitted on state transitions.
     * Routed to: pipeline:{id} + org:{orgId}
     */
    @KafkaListener(topics = KafkaTopics.PIPELINE_STATUS, groupId = "notification-service")
    public void handleStatusChange(StatusChangeEvent event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("pipelineId", event.getPipelineId());
        payload.put("previousStatus", event.getPreviousStatus().name());
        payload.put("newStatus", event.getNewStatus().name());
        payload.put("reason", event.getReason());

        dispatcher.dispatch(SseEvent.builder()
                .channel("pipeline:" + event.getPipelineId())
                .orgChannel(resolveOrgChannel(event.getPipelineId()))
                .eventType("STATUS_CHANGE")
                .payload(payload)
                .timestamp(event.getTimestamp())
                .build());
    }

    /**
     * Pipeline error events — emitted per failed row/chunk.
     * Routed to: pipeline:{id} (monitor page only, not dashboard to avoid noise)
     */
    @KafkaListener(topics = KafkaTopics.PIPELINE_ERRORS, groupId = "notification-service")
    public void handleError(ErrorEvent event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("pipelineId", event.getPipelineId());
        payload.put("errorType", event.getErrorType().name());
        payload.put("sourceTable", event.getSourceTable());
        payload.put("targetTable", event.getTargetTable());
        payload.put("chunkNumber", event.getChunkNumber());
        payload.put("errorMessage", event.getErrorMessage());
        payload.put("pipelineStopped", event.isPipelineStopped());

        dispatcher.dispatch(SseEvent.builder()
                .channel("pipeline:" + event.getPipelineId())
                // Errors don't go to org channel — too noisy for dashboard
                .eventType("ERROR")
                .payload(payload)
                .timestamp(event.getTimestamp())
                .build());
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Resolve the org channel for a pipeline.
     *
     * In a full implementation, this would look up the pipeline's orgId.
     * For now, we use a convention: the orgId is embedded in the Kafka event
     * or looked up from a cache. Placeholder returns null until pipeline events
     * carry orgId (requires adding orgId to ProgressEvent/StatusChangeEvent).
     *
     * TODO: Add orgId to PipelineEvents or maintain a pipeline→org cache.
     */
    private String resolveOrgChannel(String pipelineId) {
        // Placeholder — will be replaced when pipeline events carry orgId
        // For now, org-level subscribers won't receive pipeline events
        return null;
    }
}