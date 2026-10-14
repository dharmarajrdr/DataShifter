package com.datashifter.notification.hub.engine;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.Callable;

/**
 * Executes delivery attempts with exponential backoff retries.
 */
@Component
@Slf4j
public class RetryExecutor {

    @Value("${notifyhub.retry.max-attempts:3}")
    private int maxAttempts = 3;

    @Value("${notifyhub.retry.initial-interval-ms:1000}")
    private long initialIntervalMs = 1000;

    @Value("${notifyhub.retry.multiplier:2.0}")
    private double multiplier = 2.0;

    @Value("${notifyhub.retry.max-interval-ms:10000}")
    private long maxIntervalMs = 10000;

    @FunctionalInterface
    public interface ThrowingRunnable {
        void run() throws Exception;
    }

    public void executeWithRetry(String channelName, ThrowingRunnable task) throws Exception {
        executeWithRetry(channelName, () -> {
            task.run();
            return null;
        });
    }

    public <T> T executeWithRetry(String channelName, Callable<T> task) throws Exception {
        int attempt = 0;
        long interval = initialIntervalMs;
        Exception lastException = null;

        while (attempt < maxAttempts) {
            attempt++;
            try {
                return task.call();
            } catch (Exception e) {
                lastException = e;
                log.warn("Delivery attempt {}/{} failed for channel '{}': {}",
                        attempt, maxAttempts, channelName, e.getMessage());

                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(interval);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw ie;
                    }
                    interval = Math.min((long) (interval * multiplier), maxIntervalMs);
                }
            }
        }

        throw lastException;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }
}
