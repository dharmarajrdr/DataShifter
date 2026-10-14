package com.datashifter.connector.spi.adapters.postgres.cdc;

import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * Manages in-memory transaction boundaries for PostgreSQL WAL records.
 * Buffers mutations until a COMMIT marker is read, discarding aborted transactions
 * and ensuring atomic replay to the target system.
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

    /**
     * Processes an incoming WAL record according to transactional boundaries.
     *
     * @param record incoming parsed WAL record
     * @return list of records ready to be emitted, or empty list if record is buffered or aborted
     */
    public synchronized List<PostgresWalRecord> processRecord(PostgresWalRecord record) {
        if (record == null) return Collections.emptyList();

        String txId = record.getTransactionId();

        // 1. Standalone record without transaction ID -> Emit immediately
        if (txId == null || txId.isBlank()) {
            return record.isTransactionBoundary() ? Collections.emptyList() : List.of(record);
        }

        // 2. COMMIT marker received -> Flush buffered transaction
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

        // 3. ABORT marker received -> Discard all buffered events for this transaction
        if (record.isAbort()) {
            List<PostgresWalRecord> discarded = openTransactions.remove(txId);
            overflowedTransactions.remove(txId);
            int count = discarded != null ? discarded.size() : 0;
            log.debug("Aborted PostgreSQL transaction {}: discarded {} buffered changes at LSN {}", txId, count, record.getLsnFormatted());
            return Collections.emptyList();
        }

        // 4. BEGIN marker received -> Initialize transaction list
        if (record.isBegin()) {
            openTransactions.putIfAbsent(txId, new ArrayList<>());
            return Collections.emptyList();
        }

        // 5. Overflow handling: if transaction buffer exceeds threshold, fallback to direct streaming
        if (overflowedTransactions.contains(txId)) {
            return List.of(record);
        }

        List<PostgresWalRecord> txList = openTransactions.computeIfAbsent(txId, k -> new ArrayList<>());
        if (txList.size() >= maxBufferSizePerTx) {
            log.warn("Transaction {} exceeded buffer limit ({}) at LSN {}. Flushing in-flight records.", txId, maxBufferSizePerTx, record.getLsnFormatted());
            overflowedTransactions.add(txId);
            List<PostgresWalRecord> overflow = new ArrayList<>(txList);
            txList.clear();
            overflow.add(record);
            return overflow;
        }

        // 6. Buffer record in transaction
        txList.add(record);
        return Collections.emptyList();
    }

    public synchronized int getOpenTransactionCount() {
        return openTransactions.size();
    }

    public synchronized void clear() {
        openTransactions.clear();
        overflowedTransactions.clear();
    }
}
