package com.datashifter.notification.models;

import lombok.Builder;
import lombok.Getter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.Set;

/**
 * Represents a single SSE connection from a browser client.
 *
 * Each subscription tracks:
 * <ul>
 *   <li>The SseEmitter (the actual HTTP connection)</li>
 *   <li>The set of channels the client is listening to</li>
 *   <li>The user/org identity (from JWT) for authorization</li>
 *   <li>Connection metadata for monitoring and cleanup</li>
 * </ul>
 */
@Getter
@Builder
public class SseSubscription {

    /** Unique ID for this subscription (UUID) */
    private final String id;

    /** The SSE emitter — represents the open HTTP connection to the browser */
    private final SseEmitter emitter;

    /** Channels this client is subscribed to (e.g., "pipeline:p-001", "org:org-001") */
    private final Set<String> channels;

    /** User ID from JWT — used for per-user connection limits */
    private final String userId;

    /** Organization ID from JWT — used to verify channel access */
    private final String orgId;

    /** When this connection was established */
    @Builder.Default
    private final Instant connectedAt = Instant.now();
}
