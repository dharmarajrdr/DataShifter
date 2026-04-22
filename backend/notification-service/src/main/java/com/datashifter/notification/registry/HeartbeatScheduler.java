package com.datashifter.notification.registry;

import com.datashifter.notification.config.SseConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodic heartbeat sender for SSE connections.
 *
 * <h3>Why heartbeats?</h3>
 * Reverse proxies (nginx, cloud load balancers) and browsers may close
 * idle HTTP connections after a timeout (typically 60-120 seconds).
 * SSE connections are long-lived by design, so we send periodic comment
 * lines (invisible to the client's event handlers) to keep them alive.
 *
 * <h3>SSE comment format:</h3>
 * Lines starting with ":" are SSE comments — they are processed by the
 * browser's EventSource but don't fire any event listeners. They just
 * keep the TCP connection active.
 *
 * The interval is configurable via datashifter.sse.heartbeat-interval-ms
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HeartbeatScheduler {

    private final EventDispatcher dispatcher;
    private final SseConfig config;

    /**
     * Runs at a fixed rate defined by the heartbeat interval.
     * Default: every 15 seconds.
     */
    @Scheduled(fixedRateString = "${datashifter.sse.heartbeat-interval-ms:15000}")
    public void sendHeartbeats() {
        dispatcher.sendHeartbeat();
    }
}
