package com.datashifter.notification.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * SSE configuration properties.
 *
 * Controls connection timeouts, heartbeat intervals,
 * and per-user connection limits.
 *
 * Configured in application.properties under datashifter.sse.*
 */
@Configuration
@ConfigurationProperties(prefix = "datashifter.sse")
@Getter
@Setter
public class SseConfig {

    /**
     * Timeout for idle SSE connections in milliseconds.
     * 0 = no timeout (connection stays open indefinitely).
     * Default: 0 (recommended — client handles reconnection).
     */
    private long timeoutMs = 0;

    /**
     * Heartbeat interval in milliseconds.
     * Sends a comment line (:heartbeat) to keep the connection alive
     * through reverse proxies and load balancers that may close idle connections.
     * Default: 15000 (15 seconds).
     */
    private long heartbeatIntervalMs = 15000;

    /**
     * Maximum number of concurrent SSE connections per user.
     * Prevents a single user from exhausting server resources
     * (e.g., opening 100 tabs with monitor pages).
     * Default: 10.
     */
    private int maxConnectionsPerUser = 10;
}
