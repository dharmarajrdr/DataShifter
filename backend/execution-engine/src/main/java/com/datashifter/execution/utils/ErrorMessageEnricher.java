package com.datashifter.execution.utils;

import java.util.Map;

public final class ErrorMessageEnricher {

    private ErrorMessageEnricher() {}

    public static String enrich(String rawError, Map<String, Object> record, String sourceTable, String targetTable) {
        if (rawError == null) return "Unknown write error";

        StringBuilder msg = new StringBuilder();

        if (rawError.contains("column index is out of range")) {
            int recordCols = record != null ? record.size() : 0;
            msg.append(String.format("Column count mismatch: target record has %d columns but INSERT expects fewer. ", recordCols));
            msg.append("Check if auto-generated PK (e.g., SERIAL id) is mapped — it should be excluded for INSERT_ONLY, or use UPSERT mode. ");
            if (record != null) msg.append("Columns in record: ").append(record.keySet());
            return msg.toString();
        }

        if (rawError.contains("is of type") && rawError.contains("but expression is of type")) {
            msg.append("Type mismatch: ").append(rawError);
            msg.append(" — Add a transform (TO_DATE, TO_NUMBER, TO_STRING) to convert the source value before writing.");
            return msg.toString();
        }

        if (rawError.contains("violates not-null constraint") || rawError.contains("cannot be null") || rawError.contains("ORA-01400")) {
            msg.append("NOT NULL violation: ").append(rawError);
            msg.append(" — Either map a source column to this target column, add a system value (STATIC_VALUE/CURRENT_TIMESTAMP), or use DEFAULT_IF_NULL transform.");
            return msg.toString();
        }

        if (rawError.contains("duplicate key") || rawError.contains("unique constraint") || rawError.contains("ORA-00001")) {
            msg.append("Duplicate key: ").append(rawError);
            msg.append(" — The target table already has a row with this key. Use UPSERT write mode to handle duplicates, or TRUNCATE the target table before re-running.");
            return msg.toString();
        }

        if (rawError.contains("foreign key constraint") || rawError.contains("ORA-02291")) {
            msg.append("Foreign key violation: ").append(rawError);
            msg.append(" — The referenced row doesn't exist in the parent table. Check table execution order and ensure parent tables are migrated first.");
            return msg.toString();
        }

        if (rawError.contains("check constraint") || rawError.contains("ORA-02290")) {
            msg.append("Check constraint violation: ").append(rawError);
            msg.append(" — The value doesn't meet the table's CHECK constraint. Review the transform logic or source data.");
            return msg.toString();
        }

        if (rawError.contains("current transaction is aborted")) {
            return "Cascading error: a previous row in this batch failed, causing the entire batch to abort. Enable 'Ignore Exceptions' in pipeline settings to skip bad rows.";
        }

        return rawError;
    }
}
