package com.datashifter.execution.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EngineHeartbeatPublisherTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private EngineHeartbeatPublisher publisher;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("publishHeartbeat sets key in Redis with TTL")
    void testPublishHeartbeat() {
        publisher.publishHeartbeat();
        verify(valueOperations).set(
                eq(EngineHeartbeatPublisher.HEARTBEAT_KEY),
                eq("UP"),
                eq(Duration.ofSeconds(8))
        );
    }

    @Test
    @DisplayName("onShutdown deletes heartbeat key")
    void testOnShutdown() {
        publisher.onShutdown();
        verify(redisTemplate).delete(EngineHeartbeatPublisher.HEARTBEAT_KEY);
    }
}
