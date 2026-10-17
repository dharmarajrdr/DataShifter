package com.datashifter.execution.services;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
public class EngineHeartbeatPublisher {

    public static final String HEARTBEAT_KEY = "engine:execution-engine:heartbeat";
    public static final Duration HEARTBEAT_TTL = Duration.ofSeconds(8);

    private final StringRedisTemplate redisTemplate;

    @PostConstruct
    public void onStart() {
        publishHeartbeat();
    }

    @Scheduled(fixedRate = 3000)
    public void publishHeartbeat() {
        try {
            redisTemplate.opsForValue().set(HEARTBEAT_KEY, "UP", HEARTBEAT_TTL);
            log.trace("Execution engine heartbeat published to Redis");
        } catch (Exception e) {
            log.error("Failed to publish engine heartbeat: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void onShutdown() {
        try {
            redisTemplate.delete(HEARTBEAT_KEY);
            log.info("Execution engine heartbeat cleared from Redis");
        } catch (Exception e) {
            log.warn("Failed to delete engine heartbeat on shutdown: {}", e.getMessage());
        }
    }
}
