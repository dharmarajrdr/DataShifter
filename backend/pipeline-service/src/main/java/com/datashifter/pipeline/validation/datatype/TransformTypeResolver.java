package com.datashifter.pipeline.validation.datatype;

import com.datashifter.common.enums.TransformFunction;
import com.datashifter.common.models.ColumnMapping;
import com.datashifter.common.models.Transformation;
import lombok.Builder;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

/**
 * Evaluates built-in (non-UDF) transformation chains at compile time to determine
 * the effective output {@link CanonicalDataType} and verify input compatibility
 * for each transformation step.
 */
@Component
public class TransformTypeResolver {

    @Getter
    @Builder
    public static class TypeResolutionResult {
        private final boolean skippedForUdf;
        private final CanonicalDataType effectiveType;
        private final boolean transformed;
        private final String transformError;
    }

    /**
     * Checks whether the column mapping contains any UDF transformation.
     * Mappings using UDFs are validated at runtime rather than compile time.
     */
    public boolean hasUdf(ColumnMapping mapping) {
        if (mapping == null || mapping.getTransformations() == null || mapping.getTransformations().isEmpty()) {
            return false;
        }
        return mapping.getTransformations().stream()
                .anyMatch(t -> t != null && t.getFunctionName() == TransformFunction.UDF);
    }

    /**
     * Resolves the effective output {@link CanonicalDataType} after applying all built-in
     * transformations on the given {@link ColumnMapping}.
     */
    public TypeResolutionResult resolveEffectiveType(
            ColumnMapping mapping,
            CanonicalDataType sourceCanonicalType,
            String rawSourceType,
            String targetTable,
            String targetColumn) {

        if (hasUdf(mapping)) {
            return TypeResolutionResult.builder()
                    .skippedForUdf(true)
                    .effectiveType(CanonicalDataType.UNKNOWN)
                    .transformed(true)
                    .build();
        }

        if (mapping.getTransformations() == null || mapping.getTransformations().isEmpty()) {
            return TypeResolutionResult.builder()
                    .skippedForUdf(false)
                    .effectiveType(sourceCanonicalType != null ? sourceCanonicalType : CanonicalDataType.UNKNOWN)
                    .transformed(false)
                    .build();
        }

        List<Transformation> orderedTransforms = mapping.getTransformations().stream()
                .filter(t -> t != null && t.getFunctionName() != null)
                .sorted(Comparator.comparing(t -> t.getExecutionOrder() != null ? t.getExecutionOrder() : 0))
                .toList();

        CanonicalDataType currentType = sourceCanonicalType != null ? sourceCanonicalType : CanonicalDataType.UNKNOWN;

        for (Transformation t : orderedTransforms) {
            TransformFunction fn = t.getFunctionName();

            switch (fn) {
                // System value generators — produce fixed output types regardless of input
                case CURRENT_TIMESTAMP, CURRENT_DATE -> currentType = CanonicalDataType.DATE_TIME;
                case STATIC_VALUE -> currentType = CanonicalDataType.STRING;
                case UUID -> currentType = CanonicalDataType.UUID;
                case ROW_NUMBER -> currentType = CanonicalDataType.NUMERIC;

                // Null handling — preserves input type if present, otherwise STRING
                case DEFAULT_IF_NULL -> {
                    if (currentType == CanonicalDataType.UNKNOWN) {
                        currentType = CanonicalDataType.STRING;
                    }
                }

                // String / Text transformations
                case TRIM, UPPER, LOWER, CONCAT, APPEND, PREPEND, CONCAT_COLUMNS, SUBSTRING, TO_STRING ->
                        currentType = CanonicalDataType.STRING;

                // Type conversion transformations
                case TO_NUMBER -> {
                    if (currentType == CanonicalDataType.DATE_TIME
                            || currentType == CanonicalDataType.BINARY
                            || currentType == CanonicalDataType.JSON
                            || currentType == CanonicalDataType.UUID) {
                        return TypeResolutionResult.builder()
                                .skippedForUdf(false)
                                .effectiveType(CanonicalDataType.NUMERIC)
                                .transformed(true)
                                .transformError(String.format(
                                        "%s: Cannot apply TO_NUMBER transform on column \"%s\" with input type %s",
                                        targetTable, targetColumn, rawSourceType != null ? rawSourceType : currentType))
                                .build();
                    }
                    currentType = CanonicalDataType.NUMERIC;
                }

                case TO_BOOLEAN -> {
                    if (currentType == CanonicalDataType.DATE_TIME
                            || currentType == CanonicalDataType.BINARY
                            || currentType == CanonicalDataType.JSON
                            || currentType == CanonicalDataType.UUID) {
                        return TypeResolutionResult.builder()
                                .skippedForUdf(false)
                                .effectiveType(CanonicalDataType.BOOLEAN)
                                .transformed(true)
                                .transformError(String.format(
                                        "%s: Cannot apply TO_BOOLEAN transform on column \"%s\" with input type %s",
                                        targetTable, targetColumn, rawSourceType != null ? rawSourceType : currentType))
                                .build();
                    }
                    currentType = CanonicalDataType.BOOLEAN;
                }

                case TO_DATE -> {
                    if (currentType == CanonicalDataType.BINARY
                            || currentType == CanonicalDataType.JSON
                            || currentType == CanonicalDataType.BOOLEAN) {
                        return TypeResolutionResult.builder()
                                .skippedForUdf(false)
                                .effectiveType(CanonicalDataType.DATE_TIME)
                                .transformed(true)
                                .transformError(String.format(
                                        "%s: Cannot apply TO_DATE transform on column \"%s\" with input type %s",
                                        targetTable, targetColumn, rawSourceType != null ? rawSourceType : currentType))
                                .build();
                    }
                    currentType = CanonicalDataType.DATE_TIME;
                }

                // Math / Numeric transformations — require NUMERIC input
                case ROUND, CEIL, FLOOR, ABS, TRUNC -> {
                    if (currentType != CanonicalDataType.NUMERIC && currentType != CanonicalDataType.UNKNOWN) {
                        return TypeResolutionResult.builder()
                                .skippedForUdf(false)
                                .effectiveType(CanonicalDataType.NUMERIC)
                                .transformed(true)
                                .transformError(String.format(
                                        "%s: Numeric transform %s on column \"%s\" requires a numeric input, but got %s",
                                        targetTable, fn.name(), targetColumn,
                                        rawSourceType != null ? rawSourceType : currentType))
                                .build();
                    }
                    currentType = CanonicalDataType.NUMERIC;
                }

                // JSON transformations
                case TO_JSON, TO_JSON_ARRAY -> currentType = CanonicalDataType.JSON;

                default -> {
                    // Unhandled or UDF
                }
            }
        }

        return TypeResolutionResult.builder()
                .skippedForUdf(false)
                .effectiveType(currentType)
                .transformed(true)
                .build();
    }

    /**
     * Checks whether the effective source {@link CanonicalDataType} is compatible with
     * the target column's {@link CanonicalDataType} across the given source and target dialects.
     */
    public boolean isTypeCompatible(
            CanonicalDataType effectiveSourceType,
            String rawSourceType,
            DatabaseTypeDialect sourceDialect,
            CanonicalDataType targetType,
            String rawTargetType,
            DatabaseTypeDialect targetDialect,
            boolean isTransformed) {

        if (effectiveSourceType == null
                || targetType == null
                || effectiveSourceType == CanonicalDataType.UNKNOWN
                || targetType == CanonicalDataType.UNKNOWN) {
            return true;
        }

        // Same canonical family (e.g., NUMERIC <-> NUMERIC, STRING <-> STRING, DATE_TIME <-> DATE_TIME)
        if (effectiveSourceType == targetType) {
            return true;
        }

        // UUID <-> STRING (e.g., Postgres UUID <-> Oracle VARCHAR2/CHAR or UUID transform -> VARCHAR)
        if ((effectiveSourceType == CanonicalDataType.UUID && targetType == CanonicalDataType.STRING)
                || (effectiveSourceType == CanonicalDataType.STRING && targetType == CanonicalDataType.UUID)) {
            return true;
        }

        // JSON <-> STRING (e.g., TO_JSON / Postgres JSONB <-> Oracle CLOB/VARCHAR2)
        if ((effectiveSourceType == CanonicalDataType.JSON && targetType == CanonicalDataType.STRING)
                || (effectiveSourceType == CanonicalDataType.STRING && targetType == CanonicalDataType.JSON)) {
            return true;
        }

        // BOOLEAN <-> dialect-specific boolean representations (e.g., Postgres BOOLEAN <-> Oracle NUMBER(1) / CHAR(1))
        if (effectiveSourceType == CanonicalDataType.BOOLEAN && targetDialect != null) {
            if (targetDialect.canRepresentBoolean(targetType, rawTargetType)) {
                return true;
            }
        }
        if (targetType == CanonicalDataType.BOOLEAN && !isTransformed && sourceDialect != null) {
            if (sourceDialect.canRepresentBoolean(effectiveSourceType, rawSourceType)) {
                return true;
            }
        }

        return false;
    }
}
