package com.datashifter.connector.cdc.replay;

import com.datashifter.common.cdc.CdcEvent;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;

/**
 * Key-based partitioner for parallel CDC replay.
 * Hashing table name + primary key guarantees that all operations affecting the exact
 * same database row (e.g., INSERT followed by UPDATE, or UPDATE followed by DELETE)
 * are assigned to the exact same partition worker thread, preventing race conditions
 * and out-of-order writes.
 */
@Component
public class CdcKeyPartitioner {

    /**
     * Computes the target partition index for a CDC event.
     *
     * @param event         incoming CDC event
     * @param numPartitions total number of worker partitions (> 0)
     * @return partition index in range [0, numPartitions - 1]
     */
    public int partition(CdcEvent event, int numPartitions) {
        if (numPartitions <= 1 || event == null) {
            return 0;
        }

        String routingKey = getRoutingKey(event);
        return Math.abs(routingKey.hashCode()) % numPartitions;
    }

    /**
     * Extracts a deterministic routing key for the event.
     */
    public String getRoutingKey(CdcEvent event) {
        if (event == null) return "default";

        String table = event.getFullTableName() != null ? event.getFullTableName() : "unknown";
        Map<String, Object> pkValues = event.getPrimaryKeyValues();

        if (pkValues != null && !pkValues.isEmpty()) {
            StringBuilder sb = new StringBuilder(table).append("#");
            pkValues.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(e -> sb.append(e.getKey()).append("=").append(Objects.toString(e.getValue(), "")).append(";"));
            return sb.toString();
        }

        // If no primary key explicitly tagged, inspect ID in afterData or beforeData
        Map<String, Object> data = event.getAfterData() != null && !event.getAfterData().isEmpty()
                ? event.getAfterData() : event.getBeforeData();
        if (data != null && data.containsKey("ID")) {
            return table + "#ID=" + data.get("ID");
        }

        // Fallback: partition by table name to preserve per-table ordering
        return table;
    }
}
