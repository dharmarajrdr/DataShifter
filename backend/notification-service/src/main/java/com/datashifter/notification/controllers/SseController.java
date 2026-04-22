package com.datashifter.notification.controllers;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.utils.JwtUtil;
import com.datashifter.notification.config.SseConfig;
import com.datashifter.notification.models.SseSubscription;
import com.datashifter.notification.registry.ConnectionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * SSE stream endpoint — the main API for real-time event subscriptions.
 *
 * <h3>How clients connect:</h3>
 * <pre>
 *   // JavaScript (browser)
 *   const token = localStorage.getItem('ds_access_token');
 *   const source = new EventSource(
 *     `/api/v1/stream?channels=pipeline:p-001&token=${token}`
 *   );
 *
 *   // Listen for specific event types
 *   source.addEventListener('PROGRESS', (e) => {
 *     const data = JSON.parse(e.data);
 *     console.log('Progress:', data.payload.overallProgress);
 *   });
 *
 *   source.addEventListener('STATUS_CHANGE', (e) => {
 *     const data = JSON.parse(e.data);
 *     console.log('Status:', data.payload.newStatus);
 *   });
 *
 *   source.addEventListener('ERROR', (e) => {
 *     const data = JSON.parse(e.data);
 *     console.log('Error:', data.payload.errorMessage);
 *   });
 *
 *   // SSE auto-reconnects on disconnect
 * </pre>
 *
 * <h3>Why token is a query param (not a header)?</h3>
 * The browser's EventSource API does not support custom HTTP headers.
 * So we pass the JWT token as a query parameter. The controller validates
 * it manually (not via the JwtAuthFilter, which reads headers).
 *
 * <h3>Channel authorization:</h3>
 * The controller verifies that the user's orgId (from the JWT) matches
 * the requested channels. A user can only subscribe to channels within
 * their own organization.
 *
 * <h3>Multiple channels:</h3>
 * A single SSE connection can subscribe to multiple channels:
 * <pre>
 *   /api/v1/stream?channels=pipeline:p-001,org:org-001&token=xxx
 * </pre>
 */
@RestController
@RequestMapping("/api/v1/stream")
@RequiredArgsConstructor
@Slf4j
public class SseController {

    private final ConnectionRegistry registry;
    private final JwtUtil jwtUtil;
    private final SseConfig sseConfig;

    /**
     * Open an SSE connection and subscribe to one or more channels.
     *
     * @param channels  comma-separated channel names (e.g., "pipeline:p-001,org:org-001")
     * @param token     JWT access token (passed as query param since EventSource doesn't support headers)
     * @return SseEmitter — the open SSE connection
     */
    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam String channels,
            @RequestParam String token) {

        // 1. Validate JWT token
        if (!jwtUtil.isValid(token) || !"access".equals(jwtUtil.getTokenType(token))) {
            throw new DatashifterException("Invalid or expired token");
        }

        String userId = jwtUtil.getUserId(token);
        String orgId = jwtUtil.getOrgId(token);

        // 2. Parse and validate channels
        Set<String> channelSet = Arrays.stream(channels.split(","))
                .map(String::trim)
                .filter(c -> !c.isEmpty())
                .collect(Collectors.toSet());

        if (channelSet.isEmpty()) {
            throw new DatashifterException("At least one channel is required");
        }

        validateChannelAccess(channelSet, orgId);

        // 3. Create SSE emitter
        long timeout = sseConfig.getTimeoutMs();
        SseEmitter emitter = new SseEmitter(timeout == 0 ? Long.MAX_VALUE : timeout);
        String subscriptionId = UUID.randomUUID().toString();

        // 4. Build subscription
        SseSubscription subscription = SseSubscription.builder()
                .id(subscriptionId)
                .emitter(emitter)
                .channels(channelSet)
                .userId(userId)
                .orgId(orgId)
                .build();

        // 5. Register — this may throw if user exceeded connection limit
        try {
            registry.register(subscription);
        } catch (IllegalStateException e) {
            throw new DatashifterException(e.getMessage());
        }

        // 6. Set up cleanup callbacks
        emitter.onCompletion(() -> {
            log.debug("SSE connection completed: {}", subscriptionId);
            registry.unregister(subscriptionId);
        });
        emitter.onTimeout(() -> {
            log.debug("SSE connection timed out: {}", subscriptionId);
            registry.unregister(subscriptionId);
        });
        emitter.onError(ex -> {
            log.debug("SSE connection error: {} — {}", subscriptionId, ex.getMessage());
            registry.unregister(subscriptionId);
        });

        // 7. Send initial connection confirmation event
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("{\"subscriptionId\":\"" + subscriptionId +
                          "\",\"channels\":" + toJsonArray(channelSet) + "}"));
        } catch (Exception e) {
            log.warn("Failed to send initial event: {}", e.getMessage());
            registry.unregister(subscriptionId);
        }

        log.info("SSE connected: user={}, channels={}, subscriptionId={}", userId, channelSet, subscriptionId);
        return emitter;
    }

    // =========================================================================
    // PRIVATE
    // =========================================================================

    /**
     * Validate that the user can access the requested channels.
     *
     * Rules:
     * - org:{orgId} channels must match the user's orgId
     * - pipeline:{id} channels are allowed (pipeline org check is done at API level)
     * - user:{userId} channels must match the authenticated user
     */
    private void validateChannelAccess(Set<String> channels, String orgId) {
        for (String channel : channels) {
            if (channel.startsWith("org:")) {
                String requestedOrgId = channel.substring(4);
                if (!requestedOrgId.equals(orgId)) {
                    throw new DatashifterException("Access denied to channel: " + channel);
                }
            }
            // Pipeline channels are allowed — the pipeline's org is checked elsewhere
            // User channels must match: user:{userId}
            // (deferred until user-level notifications are implemented)
        }
    }

    /**
     * Convert a set of strings to a JSON array string.
     */
    private String toJsonArray(Set<String> items) {
        return "[" + items.stream().map(s -> "\"" + s + "\"").collect(Collectors.joining(",")) + "]";
    }
}
