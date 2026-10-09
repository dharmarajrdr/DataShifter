package com.datashifter.execution.services.implementations;

import com.datashifter.execution.contexts.ExecutionContext.ResolvedColumnMapping;
import com.datashifter.execution.exceptions.UdfFailChunkException;
import com.datashifter.execution.exceptions.UdfSkipRowException;
import com.datashifter.execution.exceptions.UdfStopPipelineException;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Maps source records (M columns) to target records (N columns).
 *
 * Scenarios handled:
 *   M = N  → all columns mapped 1:1
 *   M > N  → extra source columns are ignored (not in mappings list)
 *   M < N  → unmapped target columns get defaultValue or null
 *
 * Per-column features:
 *   - Transformer chain applied in order
 *   - Transform errors caught per-column (doesn't fail entire row unless configured)
 *   - Unmapped target columns filled with default or null
 *   - Diagnostics: tracks which columns had transform errors
 *   - Supports UDF Failure Policies (SKIP_ROW, DEFAULT_VALUE, FAIL_CHUNK, STOP_PIPELINE)
 */
@Service
@Slf4j
public class ColumnMapperService {

    /**
     * Map a single source record to a target record.
     *
     * @param sourceRecord    raw source row (column_name → value)
     * @param columnMappings  resolved mappings with transformer chains
     * @return                result containing the target record and any per-column errors
     */
    public MappingResult mapRecord(Map<String, Object> sourceRecord,
                                    List<ResolvedColumnMapping> columnMappings) {

        Map<String, Object> targetRecord = new LinkedHashMap<>();
        List<ColumnError> columnErrors = new ArrayList<>();

        for (ResolvedColumnMapping mapping : columnMappings) {
            String targetCol = mapping.getTargetColumn();

            try {
                Object value = resolveValue(sourceRecord, mapping);
                targetRecord.put(targetCol, value);
            } catch (UdfSkipRowException e) {
                // SKIP_ROW failure policy: skip the entire record
                columnErrors.add(ColumnError.builder()
                        .sourceColumn(mapping.getSourceColumn())
                        .targetColumn(targetCol)
                        .errorMessage(e.getMessage())
                        .originalValue(mapping.getSourceColumn() != null
                                ? sourceRecord.get(mapping.getSourceColumn()) : null)
                        .build());

                return MappingResult.builder()
                        .targetRecord(null)
                        .columnErrors(columnErrors)
                        .skipped(true)
                        .success(false)
                        .build();
            } catch (UdfFailChunkException | UdfStopPipelineException e) {
                // Propagate FAIL_CHUNK and STOP_PIPELINE immediately
                throw e;
            } catch (Exception e) {
                // Standard transform error on this column — record the error
                columnErrors.add(ColumnError.builder()
                        .sourceColumn(mapping.getSourceColumn())
                        .targetColumn(targetCol)
                        .errorMessage(e.getMessage())
                        .originalValue(mapping.getSourceColumn() != null
                                ? sourceRecord.get(mapping.getSourceColumn()) : null)
                        .build());

                // Put null for the failed column — the write may still succeed if nullable
                targetRecord.put(targetCol, null);
            }
        }

        return MappingResult.builder()
                .targetRecord(targetRecord)
                .columnErrors(columnErrors)
                .skipped(false)
                .success(columnErrors.isEmpty())
                .build();
    }

    /**
     * Map a batch of source records. Returns results with per-record diagnostics.
     */
    public BatchMappingResult mapBatch(List<Map<String, Object>> sourceRecords,
                                        List<ResolvedColumnMapping> columnMappings) {

        List<Map<String, Object>> successRecords = new ArrayList<>(sourceRecords.size());
        List<FailedMappingRecord> failedRecords = new ArrayList<>();
        int totalColumnErrors = 0;
        int skippedRowCount = 0;

        for (int i = 0; i < sourceRecords.size(); i++) {
            Map<String, Object> source = sourceRecords.get(i);
            MappingResult result = mapRecord(source, columnMappings);

            if (result.isSkipped()) {
                skippedRowCount++;
                totalColumnErrors += result.getColumnErrors().size();
                failedRecords.add(FailedMappingRecord.builder()
                        .rowIndex(i)
                        .sourceRecord(source)
                        .targetRecord(null)
                        .columnErrors(result.getColumnErrors())
                        .build());
                continue;
            }

            if (result.isSuccess()) {
                successRecords.add(result.getTargetRecord());
            } else {
                // Record has column-level errors
                totalColumnErrors += result.getColumnErrors().size();

                // Still include the record (with nulls for failed columns)
                // The write strategy will handle whether this causes a DB error
                successRecords.add(result.getTargetRecord());

                failedRecords.add(FailedMappingRecord.builder()
                        .rowIndex(i)
                        .sourceRecord(source)
                        .targetRecord(result.getTargetRecord())
                        .columnErrors(result.getColumnErrors())
                        .build());
            }
        }

        if (totalColumnErrors > 0) {
            log.warn("Batch mapping: {} rows had column errors, {} rows skipped ({} total column errors)",
                    failedRecords.size(), skippedRowCount, totalColumnErrors);
        }

        return BatchMappingResult.builder()
                .targetRecords(successRecords)
                .failedRecords(failedRecords)
                .totalColumnErrors(totalColumnErrors)
                .build();
    }

    /**
     * Simple batch mapping — returns just the target records (no diagnostics).
     * Filters out skipped rows.
     */
    public List<Map<String, Object>> mapBatchSimple(List<Map<String, Object>> sourceRecords,
                                                     List<ResolvedColumnMapping> columnMappings) {
        List<Map<String, Object>> results = new ArrayList<>(sourceRecords.size());
        for (Map<String, Object> source : sourceRecords) {
            MappingResult result = mapRecord(source, columnMappings);
            if (!result.isSkipped()) {
                results.add(result.getTargetRecord());
            }
        }
        return results;
    }

    /**
     * Simple single record mapping — returns target record directly, throws on error.
     */
    public Map<String, Object> mapRecordSimple(Map<String, Object> sourceRecord,
                                                List<ResolvedColumnMapping> columnMappings) {
        Map<String, Object> target = new LinkedHashMap<>();
        for (ResolvedColumnMapping mapping : columnMappings) {
            target.put(mapping.getTargetColumn(), resolveValue(sourceRecord, mapping));
        }
        return target;
    }

    // =========================================================================
    // PRIVATE — value resolution logic
    // =========================================================================

    private Object resolveValue(Map<String, Object> sourceRecord, ResolvedColumnMapping mapping) {

        // CASE 1: Unmapped target column (M < N) — use DB default (not in INSERT)
        if (mapping.isUnmappedTarget()) {
            return mapping.getDefaultValue();
        }

        // CASE 2: Target-only mapping — no source column, run transform chain with null/default input
        // Examples: CURRENT_TIMESTAMP, DEFAULT_IF_NULL('STANDARD'), UDF with row inputs
        if (mapping.isTargetOnly()) {
            Object value = mapping.getDefaultValue();
            if (mapping.getChain() != null) {
                value = mapping.getChain().applyWithContext(value, sourceRecord, mapping.getTargetColumn());
            }
            return value;
        }

        // CASE 3: Mapped column — read from source
        Object value = sourceRecord.get(mapping.getSourceColumn());

        // Try case-insensitive lookup if direct match fails
        if (value == null && mapping.getSourceColumn() != null) {
            for (Map.Entry<String, Object> entry : sourceRecord.entrySet()) {
                if (entry.getKey().equalsIgnoreCase(mapping.getSourceColumn())) {
                    value = entry.getValue();
                    break;
                }
            }
        }

        // CASE 4: Apply transformer chain (handles null-aware transforms like DEFAULT_IF_NULL and UDF)
        if (mapping.getChain() != null) {
            value = mapping.getChain().applyWithContext(value, sourceRecord, mapping.getTargetColumn());
        }

        return value;
    }

    // =========================================================================
    // RESULT TYPES
    // =========================================================================

    @Getter @Setter @Builder
    public static class MappingResult {
        private Map<String, Object> targetRecord;
        private List<ColumnError> columnErrors;
        private boolean success;
        private boolean skipped;
    }

    @Getter @Setter @Builder
    public static class BatchMappingResult {
        private List<Map<String, Object>> targetRecords;
        private List<FailedMappingRecord> failedRecords;
        private int totalColumnErrors;

        public boolean hasErrors() {
            return totalColumnErrors > 0;
        }
    }

    @Getter @Setter @Builder
    public static class FailedMappingRecord {
        private int rowIndex;
        private Map<String, Object> sourceRecord;
        private Map<String, Object> targetRecord;
        private List<ColumnError> columnErrors;
    }

    @Getter @Setter @Builder
    public static class ColumnError {
        private String sourceColumn;
        private String targetColumn;
        private String errorMessage;
        private Object originalValue;
    }
}