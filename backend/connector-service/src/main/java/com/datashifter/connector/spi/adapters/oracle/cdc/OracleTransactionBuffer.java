package com.datashifter.connector.spi.adapters.oracle.cdc;

import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * Manages in-memory transaction boundaries for GoldenGate trail records.
 * Buffers records belonging to open transactions until a COMMIT marker is received,
 * ensuring atomic, ordered replay.
 */
@Slf4j
public class OracleTransactionBuffer {

    private final int maxBufferSizePerTx;
    private final Map<String, List<OracleTrailRecord>> openTransactions = new LinkedHashMap<>();
    private final Set<String> overflowedTransactions = new HashSet<>();

    public OracleTransactionBuffer() {
        this(OracleTrailConstants.DEFAULT_MAX_TX_BUFFER_SIZE);
    }

    public OracleTransactionBuffer(int maxBufferSizePerTx) {
        this.maxBufferSizePerTx = maxBufferSizePerTx;
    }

    /**
     * Processes an incoming trail record.
     *
     * @param record incoming parsed record
     * @return list of records ready to be dispatched/emitted, or empty list if record was buffered
     */
    public synchronized List<OracleTrailRecord> processRecord(OracleTrailRecord record) {
        if (record == null) return Collections.emptyList();

        String txId = record.getTransactionId();

        // 1. Standalone record without transaction ID -> Emit immediately
        if (txId == null || txId.isBlank()) {
            return record.isTransactionBoundary() ? Collections.emptyList() : List.of(record);
        }

        // 2. COMMIT marker received -> Flush buffered transaction
        if (record.isCommit()) {
            List<OracleTrailRecord> buffered = openTransactions.remove(txId);
            overflowedTransactions.remove(txId);

            if (buffered != null && !buffered.isEmpty()) {
                // Ensure all records in the transaction inherit the final commit SCN and timestamp if higher
                long commitScn = record.getScn();
                for (OracleTrailRecord r : buffered) {
                    if (commitScn > 0 && (r.getScn() == 0 || commitScn > r.getScn())) {
                        r.setScn(commitScn);
                    }
                    if (record.getTimestamp() != null && r.getTimestamp() == null) {
                        r.setTimestamp(record.getTimestamp());
                    }
                }
                log.debug("Committed transaction {}: releasing {} buffered events at SCN {}", txId, buffered.size(), commitScn);
                return buffered;
            }
            return Collections.emptyList();
        }

        // 3. BEGIN marker -> Initialize transaction bucket
        if (record.isBegin()) {
            openTransactions.putIfAbsent(txId, new ArrayList<>());
            return Collections.emptyList();
        }

        // 4. If transaction has already overflowed memory threshold -> Stream record directly
        if (overflowedTransactions.contains(txId)) {
            return List.of(record);
        }

        // 5. Buffer DML record
        List<OracleTrailRecord> txRecords = openTransactions.computeIfAbsent(txId, k -> new ArrayList<>());
        if (txRecords.size() >= maxBufferSizePerTx) {
            log.warn("Transaction {} exceeded buffer limit of {} records. Switching to streaming mode.", txId, maxBufferSizePerTx);
            overflowedTransactions.add(txId);
            List<OracleTrailRecord> drained = new ArrayList<>(txRecords);
            txRecords.clear();
            drained.add(record);
            return drained;
        }

        txRecords.add(record);
        return Collections.emptyList();
    }

    /**
     * Clears all open transactions (on shutdown or stream repositioning).
     */
    public synchronized void clear() {
        openTransactions.clear();
        overflowedTransactions.clear();
    }

    public synchronized int getOpenTransactionCount() {
        return openTransactions.size();
    }
}
