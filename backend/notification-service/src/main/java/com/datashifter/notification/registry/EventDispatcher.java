package com.datashifter.notification.registry;

import com.datashifter.notification.models.SseEvent;
import com.datashifter.notification.models.SseSubscription;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Dispatches events from Kafka to matching SSE connections.
 *
 * <h3>Routing logic:</h3>
 * Each event has a primary {@code channel} and an optional {@code orgChannel}.
 * The dispatcher looks up subscribers for BOTH channels and sends the event
 * to all matching connections (deduplicated — a client subscribed to both
 * channels receives the event only once).
 *
 * <h3>Error handling:</h3>
 * If sending to an SSE connection fails (client disconnected, network error),
 * the connection is automatically unregistered via {@link ConnectionRegistry#unregister}.
 * This is fire-and-forget — we don't retry failed sends.
 *
 * <h3>Thread safety:</h3>
 * This class is called from Kafka consumer threads. The ConnectionRegistry
 * handles concurrent access to the subscription maps.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventDispatcher {

    private final ConnectionRegistry registry;
    private final ObjectMapper objectMapper;

    /**
     * Dispatch an event to all SSE connections subscribed to its channels.
     *
     * @param event the event to dispatch
     */
    public void dispatch(SseEvent event) {
        // Collect subscribers from both primary and org channels (deduplicated)
        Set<String> dispatched = new HashSet<>();

        // Primary channel: e.g., "pipeline:p-001"
        if (event.getChannel() != null) {
            dispatchToChannel(event, event.getChannel(), dispatched);
        }

        // Org channel: e.g., "org:org-001" (for dashboard updates)
        if (event.getOrgChannel() != null) {
            dispatchToChannel(event, event.getOrgChannel(), dispatched);
        }

        if (!dispatched.isEmpty()) {
            log.debug("Event dispatched: type={}, channel={}, recipients={}",
                    event.getEventType(), event.getChannel(), dispatched.size());
        }
    }

    /**
     * Send a heartbeat comment to all active connections.
     * SSE comment lines (starting with :) keep connections alive
     * through reverse proxies that close idle connections.
     */
    public void sendHeartbeat() {
        int sent = 0;
        int failed = 0;

        for (SseSubscription sub : registry.getAllSubscriptions()) {
            try {
                sub.getEmitter().send(SseEmitter.event().comment("heartbeat"));
                sent++;
            } catch (Exception e) {
                // Connection is dead — clean it up
                registry.unregister(sub.getId());
                failed++;
            }
        }

        if (sent > 0 || failed > 0) {
            log.debug("Heartbeat: sent={}, failed={}, active={}", sent, failed, registry.getTotalConnectionCount());
        }
    }

    // =========================================================================
    // PRIVATE
    // =========================================================================

    /**
     * Send an event to all subscribers of a specific channel.
     *
     * @param event      the event to send
     * @param channel    the channel to look up
     * @param dispatched set of subscription IDs already dispatched to (for dedup)
     */
    private void dispatchToChannel(SseEvent event, String channel, Set<String> dispatched) {
        List<SseSubscription> subscribers = registry.getSubscribers(channel);

        for (SseSubscription sub : subscribers) {
            // Skip if already sent to this subscription (dedup across channels)
            if (!dispatched.add(sub.getId())) continue;

            try {
                String jsonPayload = objectMapper.writeValueAsString(event);

                sub.getEmitter().send(
                        SseEmitter.event()
                                .name(event.getEventType())  // SSE event name — frontend listens via addEventListener
                                .data(jsonPayload)            // SSE data field — JSON payload
                                .id(event.getTimestamp() != null ? event.getTimestamp().toString() : null)
                );
            } catch (Exception e) {
                // Connection is broken — unregister it
                log.debug("Failed to send to subscription {}: {}", sub.getId(), e.getMessage());
                registry.unregister(sub.getId());
            }
        }
    }
}
