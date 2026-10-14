package com.datashifter.adapter.oracle.gg;

import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * Manages in-memory transaction boundaries for GoldenGate trail records.
 * Buffers records belonging to open transactions until a COMMIT marker is received.
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

    public synchronized List<OracleTrailRecord> processRecord(OracleTrailRecord record) {
        if (record == null) return Collections.emptyList();

        String txId = record.getTransactionId();

        if (txId == null || txId.isBlank()) {
            return record.isTransactionBoundary() ? Collections.emptyList() : List.of(record);
        }

        if (record.isCommit()) {
            List<OracleTrailRecord> buffered = openTransactions.remove(txId);
            overflowedTransactions.remove(txId);

            if (buffered != null && !buffered.isEmpty()) {
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

        if (record.isBegin()) {
            openTransactions.putIfAbsent(txId, new ArrayList<>());
            return Collections.emptyList();
        }

        if (overflowedTransactions.contains(txId)) {
            return List.of(record);
        }

        List<OracleTrailRecord> buffer = openTransactions.computeIfAbsent(txId, k -> new ArrayList<>());
        buffer.add(record);

        if (buffer.size() > maxBufferSizePerTx) {
            log.warn("Transaction {} exceeded max buffer size ({}); falling back to live streaming", txId, maxBufferSizePerTx);
            overflowedTransactions.add(txId);
            List<OracleTrailRecord> flushed = new ArrayList<>(buffer);
            buffer.clear();
            return flushed;
        }

        return Collections.emptyList();
    }

    public synchronized void clear() {
        openTransactions.clear();
        overflowedTransactions.clear();
    }
}
