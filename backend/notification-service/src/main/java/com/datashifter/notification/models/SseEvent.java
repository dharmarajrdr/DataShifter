package com.datashifter.notification.models;

import lombok.*;

import java.time.Instant;
import java.util.Map;

/**
 * Generic SSE event that can be published by any service.
 *
 * The notification-service routes events to SSE connections
 * based on the {@link #channel} and {@link #orgChannel} fields.
 *
 * <h3>Channel convention:</h3>
 * <pre>
 *   pipeline:{id}           → events for a specific pipeline (monitor page)
 *   pipeline:{id}:errors    → error events only
 *   org:{orgId}             → org-wide events (dashboard page)
 *   user:{userId}           → personal notifications (future)
 * </pre>
 *
 * <h3>Event types:</h3>
 * <ul>
 *   <li>PROGRESS — pipeline chunk progress update</li>
 *   <li>STATUS_CHANGE — pipeline status changed (RUNNING → COMPLETED, etc.)</li>
 *   <li>ERROR — pipeline error event</li>
 *   <li>INFLIGHT — in-flight record buffer snapshot</li>
 *   <li>NOTIFICATION — general notification (future)</li>
 * </ul>
 *
 * <h3>Usage by other services:</h3>
 * <pre>
 *   // In execution-engine or monitor-service:
 *   kafkaTemplate.send(KafkaTopics.NOTIFICATIONS, SseEvent.builder()
 *       .channel("pipeline:" + pipelineId)
 *       .orgChannel("org:" + orgId)
 *       .eventType("PROGRESS")
 *       .payload(Map.of("progress", 72.4, "rowsPerSec", 12400))
 *       .build());
 * </pre>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SseEvent {

    /**
     * Primary channel — the specific resource this event belongs to.
     * Example: "pipeline:p-001"
     */
    private String channel;

    /**
     * Organization-level channel — for broadcasting to the dashboard.
     * Example: "org:org-001"
     * Can be null if the event is not org-relevant.
     */
    private String orgChannel;

    /**
     * Event type — used as the SSE event name.
     * The frontend listens for specific types:
     *   eventSource.addEventListener('PROGRESS', handler)
     */
    private String eventType;

    /**
     * Arbitrary payload — the actual event data.
     * Serialized as JSON and sent as the SSE data field.
     */
    private Map<String, Object> payload;

    /**
     * When the event was created.
     * Set by the publishing service, not the notification-service.
     */
    @Builder.Default
    private Instant timestamp = Instant.now();

    /**
     * Optional: the user who triggered this event.
     * Useful for "User X started pipeline Y" notifications.
     */
    private String triggeredBy;
}
