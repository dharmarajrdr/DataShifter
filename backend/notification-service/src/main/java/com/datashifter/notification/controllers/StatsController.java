package com.datashifter.notification.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.notification.registry.ConnectionRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Stats endpoint for monitoring the notification service.
 *
 * Provides connection counts, channel counts, and health info.
 * Useful for ops dashboards and autoscaling decisions.
 */
@RestController
@RequestMapping("/api/v1/stream/stats")
@RequiredArgsConstructor
public class StatsController {

    private final ConnectionRegistry registry;

    /**
     * Get current SSE connection statistics.
     *
     * @return map with totalConnections, activeChannels
     */
    @GetMapping
    public ApiResponse<Map<String, Object>> getStats() {
        return ApiResponse.success(Map.of(
                "totalConnections", registry.getTotalConnectionCount(),
                "activeChannels", registry.getActiveChannelCount()
        ));
    }
}
