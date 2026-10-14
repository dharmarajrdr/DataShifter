package com.datashifter.connector.cdc.segregation;

import lombok.Getter;
import lombok.ToString;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Thread-safe observability metrics tracking segregation and filtering throughput.
 */
@Getter
@ToString
public class CdcSegregationStats {

    private final AtomicLong totalEventsReceived = new AtomicLong(0);
    private final AtomicLong eventsPassed = new AtomicLong(0);
    private final AtomicLong eventsFilteredByTable = new AtomicLong(0);
    private final AtomicLong eventsFilteredByOperation = new AtomicLong(0);
    private final AtomicLong eventsFilteredByRowFilter = new AtomicLong(0);
    private final AtomicLong eventsTransformed = new AtomicLong(0);

    public void incrementReceived() {
        totalEventsReceived.incrementAndGet();
    }

    public void incrementPassed() {
        eventsPassed.incrementAndGet();
    }

    public void incrementFilteredTable() {
        eventsFilteredByTable.incrementAndGet();
    }

    public void incrementFilteredOperation() {
        eventsFilteredByOperation.incrementAndGet();
    }

    public void incrementFilteredRowFilter() {
        eventsFilteredByRowFilter.incrementAndGet();
    }

    public void incrementTransformed() {
        eventsTransformed.incrementAndGet();
    }

    public void reset() {
        totalEventsReceived.set(0);
        eventsPassed.set(0);
        eventsFilteredByTable.set(0);
        eventsFilteredByOperation.set(0);
        eventsFilteredByRowFilter.set(0);
        eventsTransformed.set(0);
    }
}
