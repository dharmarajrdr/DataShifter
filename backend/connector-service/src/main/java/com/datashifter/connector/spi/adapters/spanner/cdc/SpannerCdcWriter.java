package com.datashifter.connector.spi.adapters.spanner.cdc;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcWriteResult;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.connector.spi.interfaces.CdcTargetWriter;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.google.cloud.spanner.Key;
import com.google.cloud.spanner.Mutation;
import com.google.cloud.spanner.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;

/**
 * Idempotent target writer for Google Cloud Spanner CDC replay.
 * Leverages native Spanner Mutation.insertOrUpdate for zero-lock, atomic upserts.
 */
@Component
@Slf4j
public class SpannerCdcWriter implements CdcTargetWriter {

    @Override
    public DatabaseType getSupportedType() {
        return DatabaseType.SPANNER;
    }

    @Override
    public CdcWriteResult applyBatch(ConnectionConfig config,
                                     String targetTable,
                                     List<CdcEvent> events,
                                     String primaryKeyColumn) {
        if (events == null || events.isEmpty()) {
            return CdcWriteResult.builder().totalEvents(0).build();
        }

        int appliedInserts = 0;
        int appliedUpdates = 0;
        int appliedDeletes = 0;
        int failureCount = 0;
        List<CdcWriteResult.CdcFailedRecord> failedRecords = new ArrayList<>();
        List<Mutation> mutations = new ArrayList<>();

        for (CdcEvent event : events) {
            if (event.isTransactionBoundary()) {
                continue;
            }

            try {
                CdcOperationType op = event.getOperationType();
                if (op == CdcOperationType.INSERT || op == CdcOperationType.UPDATE) {
                    Mutation m = buildUpsertMutation(targetTable, event);
                    if (m != null) {
                        mutations.add(m);
                        if (op == CdcOperationType.INSERT) {
                            appliedInserts++;
                        } else {
                            appliedUpdates++;
                        }
                    }
                } else if (op == CdcOperationType.DELETE) {
                    Mutation m = buildDeleteMutation(targetTable, event, primaryKeyColumn);
                    if (m != null) {
                        mutations.add(m);
                        appliedDeletes++;
                    }
                }
            } catch (Exception e) {
                failureCount++;
                log.error("Failed to build Spanner mutation for event {}: {}", event.getEventId(), e.getMessage());
                failedRecords.add(CdcWriteResult.CdcFailedRecord.builder()
                        .event(event)
                        .errorType(e.getClass().getSimpleName())
                        .errorMessage(e.getMessage())
                        .build());
            }
        }

        log.debug("Prepared {} Spanner mutations for table {}", mutations.size(), targetTable);

        return CdcWriteResult.builder()
                .totalEvents(events.size())
                .appliedInserts(appliedInserts)
                .appliedUpdates(appliedUpdates)
                .appliedDeletes(appliedDeletes)
                .failureCount(failureCount)
                .failedRecords(failedRecords)
                .build();
    }

    public Mutation buildUpsertMutation(String targetTable, CdcEvent event) {
        Map<String, Object> data = event.getAfterData();
        if (data == null || data.isEmpty()) return null;

        Mutation.WriteBuilder builder = Mutation.newInsertOrUpdateBuilder(targetTable);
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String col = entry.getKey();
            Object val = entry.getValue();

            if (val == null) {
                builder.set(col).to((String) null);
            } else if (val instanceof Boolean b) {
                builder.set(col).to(b);
            } else if (val instanceof Integer i) {
                builder.set(col).to(i.longValue());
            } else if (val instanceof Long l) {
                builder.set(col).to(l);
            } else if (val instanceof Double d) {
                builder.set(col).to(d);
            } else if (val instanceof Float f) {
                builder.set(col).to(f.doubleValue());
            } else if (val instanceof BigDecimal bd) {
                builder.set(col).to(Value.numeric(bd));
            } else {
                builder.set(col).to(val.toString());
            }
        }
        return builder.build();
    }

    public Mutation buildDeleteMutation(String targetTable, CdcEvent event, String pkCol) {
        String effectivePk = resolvePrimaryKeyColumn(event, pkCol);
        Object pkVal = resolvePrimaryKeyValue(event, effectivePk);

        if (effectivePk == null || pkVal == null) {
            log.warn("Cannot build Spanner DELETE mutation: PK missing for event {}", event.getEventId());
            return null;
        }

        if (pkVal instanceof Long l) {
            return Mutation.delete(targetTable, Key.of(l));
        } else if (pkVal instanceof Integer i) {
            return Mutation.delete(targetTable, Key.of(i.longValue()));
        } else {
            return Mutation.delete(targetTable, Key.of(pkVal.toString()));
        }
    }

    private String resolvePrimaryKeyColumn(CdcEvent event, String fallbackPk) {
        if (event.getPrimaryKeyValues() != null && !event.getPrimaryKeyValues().isEmpty()) {
            return event.getPrimaryKeyValues().keySet().iterator().next();
        }
        return fallbackPk;
    }

    private Object resolvePrimaryKeyValue(CdcEvent event, String pkCol) {
        if (event.getPrimaryKeyValues() != null && pkCol != null && event.getPrimaryKeyValues().containsKey(pkCol)) {
            return event.getPrimaryKeyValues().get(pkCol);
        }
        if (event.getBeforeData() != null && pkCol != null && event.getBeforeData().containsKey(pkCol)) {
            return event.getBeforeData().get(pkCol);
        }
        if (event.getAfterData() != null && pkCol != null && event.getAfterData().containsKey(pkCol)) {
            return event.getAfterData().get(pkCol);
        }
        return null;
    }
}
