package com.datashifter.adapter.postgres.wal;

import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * Manages in-memory transaction boundaries for PostgreSQL WAL records.
 * Buffers mutations until a COMMIT marker is read, discarding aborted transactions.
 */
@Slf4j
public class PostgresTransactionBuffer {

    private final int maxBufferSizePerTx;
    private final Map<String, List<PostgresWalRecord>> openTransactions = new LinkedHashMap<>();
    private final Set<String> overflowedTransactions = new HashSet<>();

    public PostgresTransactionBuffer() {
        this(PostgresWalConstants.DEFAULT_MAX_TX_BUFFER_SIZE);
    }

    public PostgresTransactionBuffer(int maxBufferSizePerTx) {
        this.maxBufferSizePerTx = maxBufferSizePerTx;
    }

    public synchronized List<PostgresWalRecord> processRecord(PostgresWalRecord record) {
        if (record == null) return Collections.emptyList();

        String txId = record.getTransactionId();

        if (txId == null || txId.isBlank()) {
            return record.isTransactionBoundary() ? Collections.emptyList() : List.of(record);
        }

        if (record.isCommit()) {
            List<PostgresWalRecord> buffered = openTransactions.remove(txId);
            overflowedTransactions.remove(txId);

            if (buffered != null && !buffered.isEmpty()) {
                long commitLsn = record.getLsn();
                for (PostgresWalRecord r : buffered) {
                    if (commitLsn > 0 && (r.getLsn() == 0 || commitLsn > r.getLsn())) {
                        r.setLsn(commitLsn);
                        r.setLsnFormatted(record.getLsnFormatted());
                    }
                    if (record.getTimestamp() != null && r.getTimestamp() == null) {
                        r.setTimestamp(record.getTimestamp());
                    }
                }
                log.debug("Committed PostgreSQL transaction {}: releasing {} buffered events at LSN {}", txId, buffered.size(), record.getLsnFormatted());
                return buffered;
            }
            return Collections.emptyList();
        }

        if (record.isAbort()) {
            List<PostgresWalRecord> discarded = openTransactions.remove(txId);
            overflowedTransactions.remove(txId);
            int count = discarded != null ? discarded.size() : 0;
            log.info("Aborted transaction {}: discarded {} buffered mutations", txId, count);
            return Collections.emptyList();
        }

        if (record.isBegin()) {
            openTransactions.putIfAbsent(txId, new ArrayList<>());
            return Collections.emptyList();
        }

        if (overflowedTransactions.contains(txId)) {
            return List.of(record);
        }

        List<PostgresWalRecord> buffer = openTransactions.computeIfAbsent(txId, k -> new ArrayList<>());
        buffer.add(record);

        if (buffer.size() > maxBufferSizePerTx) {
            log.warn("PostgreSQL transaction {} exceeded max buffer size ({}); falling back to live streaming", txId, maxBufferSizePerTx);
            overflowedTransactions.add(txId);
            List<PostgresWalRecord> flushed = new ArrayList<>(buffer);
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
