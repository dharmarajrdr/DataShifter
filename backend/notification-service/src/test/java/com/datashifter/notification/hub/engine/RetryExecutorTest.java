package com.datashifter.notification.hub.engine;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class RetryExecutorTest {

    @Test
    void testSuccessfulExecutionWithoutRetry() throws Exception {
        RetryExecutor executor = new RetryExecutor();
        AtomicInteger count = new AtomicInteger(0);

        executor.executeWithRetry("test-channel", count::incrementAndGet);

        assertEquals(1, count.get());
    }

    @Test
    void testRetryUntilSuccess() throws Exception {
        RetryExecutor executor = new RetryExecutor();
        AtomicInteger count = new AtomicInteger(0);

        executor.executeWithRetry("test-channel", () -> {
            if (count.incrementAndGet() < 2) {
                throw new RuntimeException("Temporary network glitch");
            }
        });

        assertEquals(2, count.get());
    }

    @Test
    void testExhaustingRetriesThrowsException() {
        RetryExecutor executor = new RetryExecutor();
        AtomicInteger count = new AtomicInteger(0);

        Exception ex = assertThrows(RuntimeException.class, () ->
                executor.executeWithRetry("failing-channel", () -> {
                    count.incrementAndGet();
                    throw new RuntimeException("Permanent failure");
                }));

        assertEquals("Permanent failure", ex.getMessage());
        assertEquals(3, count.get());
    }
}
