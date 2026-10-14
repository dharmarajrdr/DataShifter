package com.datashifter.connector.cdc.segregation;

import com.datashifter.common.enums.TransformFunction;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Function;

/**
 * Defines column-level mapping, renaming, default values, and chained transformation functions.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CdcColumnTransformation {

    /** Name of the column in the source trail/log */
    private String sourceColumn;

    /** Name of the column in the target database table */
    private String targetColumn;

    /** Optional default value to apply if source value is null or column missing */
    private String defaultValue;

    /** Ordered transformation steps to execute sequentially */
    @Builder.Default
    private List<TransformStep> steps = new ArrayList<>();

    /** Custom UDF function hook */
    private Function<Object, Object> customUdf;

    /** Execution timeout in milliseconds for custom UDF transformations (default 2000ms) */
    @Builder.Default
    private long udfTimeoutMs = 2000L;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TransformStep {
        private TransformFunction function;
        private String arguments;
    }

    /**
     * Applies this column's transformations to a value within the context of the entire row record.
     *
     * @param originalValue source column value (may be null)
     * @param fullRow       the complete row payload (for multi-column expressions like CONCAT_COLUMNS)
     * @return transformed target value
     */
    public Object apply(Object originalValue, Map<String, Object> fullRow) {
        Object current = originalValue;

        // Apply default value if value is null
        if (current == null && defaultValue != null) {
            current = defaultValue;
        }

        // Apply chained built-in transformation steps
        if (steps != null) {
            for (TransformStep step : steps) {
                current = executeStep(step, current, fullRow);
            }
        }

        // Apply custom UDF if configured (with timeout protection)
        if (customUdf != null) {
            current = executeUdfWithTimeout(customUdf, current, udfTimeoutMs);
        }

        return current;
    }

    private Object executeStep(TransformStep step, Object val, Map<String, Object> fullRow) {
        if (step == null || step.getFunction() == null) return val;

        TransformFunction fn = step.getFunction();
        String args = step.getArguments();

        switch (fn) {
            case TRIM -> {
                return val != null ? val.toString().trim() : null;
            }
            case UPPER -> {
                return val != null ? val.toString().toUpperCase(Locale.ROOT) : null;
            }
            case LOWER -> {
                return val != null ? val.toString().toLowerCase(Locale.ROOT) : null;
            }
            case CONCAT, APPEND -> {
                String suffix = args != null ? args : "";
                return (val != null ? val.toString() : "") + suffix;
            }
            case PREPEND -> {
                String prefix = args != null ? args : "";
                return prefix + (val != null ? val.toString() : "");
            }
            case SUBSTRING -> {
                if (val == null) return null;
                String str = val.toString();
                if (args != null && args.contains(",")) {
                    String[] parts = args.split(",");
                    int start = Math.max(0, Integer.parseInt(parts[0].trim()));
                    int end = Math.min(str.length(), Integer.parseInt(parts[1].trim()));
                    return (start <= end) ? str.substring(start, end) : "";
                }
                return str;
            }
            case TO_STRING -> {
                return val != null ? val.toString() : null;
            }
            case TO_NUMBER -> {
                if (val == null) return null;
                try {
                    return new BigDecimal(val.toString().trim());
                } catch (Exception e) {
                    return null;
                }
            }
            case TO_BOOLEAN -> {
                if (val == null) return null;
                String s = val.toString().trim().toLowerCase(Locale.ROOT);
                return "true".equals(s) || "1".equals(s) || "yes".equals(s) || "y".equals(s);
            }
            case ROUND -> {
                if (val == null) return null;
                int scale = (args != null && !args.isBlank()) ? Integer.parseInt(args.trim()) : 0;
                return new BigDecimal(val.toString().trim()).setScale(scale, RoundingMode.HALF_UP);
            }
            case ABS -> {
                if (val == null) return null;
                return new BigDecimal(val.toString().trim()).abs();
            }
            case CEIL -> {
                if (val == null) return null;
                return new BigDecimal(val.toString().trim()).setScale(0, RoundingMode.CEILING);
            }
            case FLOOR -> {
                if (val == null) return null;
                return new BigDecimal(val.toString().trim()).setScale(0, RoundingMode.FLOOR);
            }
            case TRUNC -> {
                if (val == null) return null;
                int scale = (args != null && !args.isBlank()) ? Integer.parseInt(args.trim()) : 0;
                return new BigDecimal(val.toString().trim()).setScale(scale, RoundingMode.DOWN);
            }
            case DEFAULT_IF_NULL -> {
                return val != null ? val : (args != null ? args : defaultValue);
            }
            case CURRENT_TIMESTAMP -> {
                return Instant.now().toString();
            }
            case CURRENT_DATE -> {
                return LocalDate.now().toString();
            }
            case UUID -> {
                return java.util.UUID.randomUUID().toString();
            }
            case STATIC_VALUE -> {
                return args != null ? args : "";
            }
            case CONCAT_COLUMNS -> {
                if (fullRow == null || args == null) return val;
                // Format: "separator|col1,col2"
                String separator = "";
                String columnsPart = args;
                if (args.contains("|")) {
                    String[] parts = args.split("\\|", 2);
                    separator = parts[0];
                    columnsPart = parts[1];
                }
                StringJoiner joiner = new StringJoiner(separator);
                for (String col : columnsPart.split(",")) {
                    Object v = fullRow.get(col.trim());
                    if (v != null) joiner.add(v.toString());
                }
                return joiner.toString();
            }
            default -> {
                return val;
            }
        }
    }

    private Object executeUdfWithTimeout(Function<Object, Object> udf, Object input, long timeoutMs) {
        ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "cdc-udf-runner");
            t.setDaemon(true);
            return t;
        });

        try {
            Future<Object> future = executor.submit(() -> udf.apply(input));
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            throw new RuntimeException("CDC UDF transformation timed out after " + timeoutMs + "ms on column " + targetColumn);
        } catch (Exception e) {
            throw new RuntimeException("CDC UDF transformation failed on column " + targetColumn + ": " + e.getMessage(), e);
        } finally {
            executor.shutdownNow();
        }
    }
}
