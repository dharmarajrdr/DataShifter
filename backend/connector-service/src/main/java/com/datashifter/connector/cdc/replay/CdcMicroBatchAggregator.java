package com.datashifter.connector.cdc.replay;

import com.datashifter.common.cdc.CdcEvent;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * High-throughput micro-batch aggregator.
 * Groups individual CDC events into batches bounded by size (e.g. 500 records)
 * or flush time interval (e.g. 200ms), balancing low replication latency with
 * maximum target database write throughput.
 */
@Slf4j
public class CdcMicroBatchAggregator {

    @Getter
    private final int maxBatchSize;
    @Getter
    private final long flushIntervalMs;

    private final ConcurrentLinkedQueue<CdcEvent> buffer = new ConcurrentLinkedQueue<>();
    private final AtomicInteger bufferSize = new AtomicInteger(0);
    private final AtomicLong lastFlushTimestamp = new AtomicLong(System.currentTimeMillis());

    public CdcMicroBatchAggregator() {
        this(500, 200L);
    }

    public CdcMicroBatchAggregator(int maxBatchSize, long flushIntervalMs) {
        this.maxBatchSize = Math.max(1, maxBatchSize);
        this.flushIntervalMs = Math.max(10L, flushIntervalMs);
    }

    /**
     * Adds an event to the micro-batch buffer.
     *
     * @param event CDC event
     * @return true if batch is now ready for immediate flushing
     */
    public boolean add(CdcEvent event) {
        if (event == null) return false;

        buffer.add(event);
        int currentCount = bufferSize.incrementAndGet();

        return currentCount >= maxBatchSize || isTimeElapsed();
    }

    /**
     * Adds multiple events to the buffer.
     *
     * @param events list of CDC events
     * @return true if batch is ready for flushing
     */
    public boolean addAll(Collection<CdcEvent> events) {
        if (events == null || events.isEmpty()) return false;

        for (CdcEvent e : events) {
            if (e != null) {
                buffer.add(e);
                bufferSize.incrementAndGet();
            }
        }

        return bufferSize.get() >= maxBatchSize || isTimeElapsed();
    }

    /**
     * Checks if the micro-batch should be flushed due to size or time threshold.
     */
    public boolean shouldFlush() {
        if (bufferSize.get() == 0) {
            return false;
        }
        return bufferSize.get() >= maxBatchSize || isTimeElapsed();
    }

    private boolean isTimeElapsed() {
        return (System.currentTimeMillis() - lastFlushTimestamp.get()) >= flushIntervalMs;
    }

    /**
     * Atomically drains the current buffer and resets the flush timer.
     *
     * @return list of accumulated events
     */
    public synchronized List<CdcEvent> drain() {
        if (buffer.isEmpty()) {
            lastFlushTimestamp.set(System.currentTimeMillis());
            return Collections.emptyList();
        }

        List<CdcEvent> drained = new ArrayList<>(bufferSize.get());
        CdcEvent event;
        while ((event = buffer.poll()) != null) {
            drained.add(event);
        }
        bufferSize.set(0);
        lastFlushTimestamp.set(System.currentTimeMillis());

        return Collections.unmodifiableList(drained);
    }

    public int getPendingCount() {
        return bufferSize.get();
    }

    public void clear() {
        buffer.clear();
        bufferSize.set(0);
        lastFlushTimestamp.set(System.currentTimeMillis());
    }
}
