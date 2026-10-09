package com.datashifter.execution.strategies.transformers;

import com.datashifter.common.exceptions.DatashifterException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// =========================================================================
// TEXT TRANSFORMERS
// =========================================================================

@Component
class TrimTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) { return input == null ? null : input.toString().trim(); }
    public String getFunctionName() { return "TRIM"; }
}

@Component
class UpperTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) { return input == null ? null : input.toString().toUpperCase(); }
    public String getFunctionName() { return "UPPER"; }
}

@Component
class LowerTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) { return input == null ? null : input.toString().toLowerCase(); }
    public String getFunctionName() { return "LOWER"; }
}

@Component
class ToStringTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) { return input == null ? null : input.toString(); }
    public String getFunctionName() { return "TO_STRING"; }
}

/**
 * CONCAT — appends a static suffix.
 * Args: the suffix string.
 * Example: CONCAT('_suffix') → "hello" becomes "hello_suffix"
 */
@Component
class ConcatTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        String suffix = args != null ? args.replace("'", "") : "";
        return (input != null ? input.toString() : "") + suffix;
    }
    public String getFunctionName() { return "CONCAT"; }
}

/**
 * APPEND — alias for CONCAT. Appends a static suffix.
 */
@Component
class AppendTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        String suffix = args != null ? args.replace("'", "") : "";
        return (input != null ? input.toString() : "") + suffix;
    }
    public String getFunctionName() { return "APPEND"; }
}

/**
 * PREPEND — prepends a static prefix.
 * Args: the prefix string.
 * Example: PREPEND('PREFIX_') → "hello" becomes "PREFIX_hello"
 */
@Component
class PrependTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        String prefix = args != null ? args.replace("'", "") : "";
        return prefix + (input != null ? input.toString() : "");
    }
    public String getFunctionName() { return "PREPEND"; }
}

/**
 * CONCAT_COLUMNS — concatenates the current value with values from other columns.
 *
 * This transformer is special: it needs access to the full source row.
 * The args format is: "separator|col1,col2,col3"
 *
 * Example: CONCAT_COLUMNS(' |last_name') on first_name="John"
 *   → reads last_name from the source row → "John Doe"
 *
 * The ColumnMapperService passes the full source row as context.
 * This transformer receives the current column value and uses args
 * to reference other column values via the TransformContext.
 *
 * NOTE: Since transformers receive (value, args), multi-column concat
 * is implemented by passing referenced column values in args at resolve time.
 * The ColumnMappingResolver pre-resolves the column references.
 *
 * Simple usage (static concat): CONCAT_COLUMNS(' |Smith') → "John Smith"
 * The execution engine resolves column references before calling transform.
 */
@Component
class ConcatColumnsTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        if (args == null || args.isEmpty()) return input;
        // Args format: "separator|value1,value2,..."
        // At this point, the column references are already resolved to actual values
        String[] parts = args.split("\\|", 2);
        String separator = parts[0].replace("'", "");
        String otherValues = parts.length > 1 ? parts[1] : "";

        StringBuilder result = new StringBuilder();
        result.append(input != null ? input.toString() : "");

        for (String val : otherValues.split(",")) {
            result.append(separator).append(val.trim().replace("'", ""));
        }
        return result.toString();
    }
    public String getFunctionName() { return "CONCAT_COLUMNS"; }
}

@Component
class SubstringTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        if (input == null) return null;
        String s = input.toString();
        String[] parts = args != null ? args.split(",") : new String[]{"0"};
        int start = Integer.parseInt(parts[0].trim());
        int end = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : s.length();
        return s.substring(Math.min(start, s.length()), Math.min(end, s.length()));
    }
    public String getFunctionName() { return "SUBSTRING"; }
}

// =========================================================================
// TYPE TRANSFORMERS
// =========================================================================

@Component
class ToNumberTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        if (input == null) return null;
        String s = input.toString().trim();
        if (s.isEmpty()) return null;
        if (s.contains(".")) return Double.parseDouble(s);
        return Long.parseLong(s);
    }
    public String getFunctionName() { return "TO_NUMBER"; }
}

/**
 * TO_BOOLEAN — converts string/number to boolean.
 * Truthy: "true", "yes", "1", "y", "t", "on" (case-insensitive), any non-zero number
 * Falsy:  "false", "no", "0", "n", "f", "off", empty string, null
 */
@Component
class ToBooleanTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        if (input == null) return null;
        if (input instanceof Boolean) return input;
        if (input instanceof Number) return ((Number) input).doubleValue() != 0;
        String s = input.toString().trim().toLowerCase();
        if (s.isEmpty()) return null;
        return switch (s) {
            case "true", "yes", "1", "y", "t", "on" -> true;
            case "false", "no", "0", "n", "f", "off" -> false;
            default -> Boolean.parseBoolean(s);
        };
    }
    public String getFunctionName() { return "TO_BOOLEAN"; }
}

@Component
class ToDateTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        if (input == null) return null;
        try {
            String pattern = args != null ? args.replace("'", "") : "yyyy-MM-dd";
            return new SimpleDateFormat(pattern).parse(input.toString().trim());
        } catch (Exception e) {
            throw new RuntimeException("TO_DATE failed for value: " + input + " with pattern: " + args, e);
        }
    }
    public String getFunctionName() { return "TO_DATE"; }
}

// =========================================================================
// NULL HANDLING
// =========================================================================

@Component
class DefaultIfNullTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        return input != null ? input : (args != null ? args.replace("'", "") : "");
    }
    public String getFunctionName() { return "DEFAULT_IF_NULL"; }
}

// =========================================================================
// SYSTEM VALUE GENERATORS
// =========================================================================

/**
 * CURRENT_TIMESTAMP — ignores input, returns current system time.
 * Use for columns like `migrated_at`, `created_at`, `updated_at`.
 *
 * No source column mapping needed — configure as transform on
 * an unmapped target column with DEFAULT_IF_NULL + CURRENT_TIMESTAMP,
 * or use as a standalone transform.
 *
 * Returns java.sql.Timestamp which JDBC drivers handle natively.
 */
@Component
class CurrentTimestampTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        return Timestamp.from(Instant.now());
    }
    public String getFunctionName() { return "CURRENT_TIMESTAMP"; }
}

// =========================================================================
// JSON TRANSFORMERS
// =========================================================================

/**
 * TO_JSON — converts the current value into a JSON object field.
 *
 * Args: "fieldName" — the key name in the JSON object.
 * If the input is already a JSON string, it's merged.
 * If not, it creates {"fieldName": value}.
 *
 * Chain multiple TO_JSON transforms to build a JSON object from multiple columns:
 *   col1 → TO_JSON('name')     → {"name": "John"}
 *   col2 → TO_JSON('email')    → {"name": "John", "email": "john@..."}
 *
 * Usage in mapping: map first source column, then use CONCAT_COLUMNS
 * to collect values, then TO_JSON to structure them.
 *
 * Simpler usage: Each mapped column that targets a JSON column
 * gets TO_JSON('fieldName'). The write layer merges them.
 */
@Component
class ToJsonTransformer implements ColumnTransformer {
    private static final ObjectMapper mapper = new ObjectMapper();

    public Object transform(Object input, String args) {
        try {
            String fieldName = args != null ? args.replace("'", "").trim() : "value";

            // If input is already a JSON string, parse and add field
            if (input instanceof String && ((String) input).trim().startsWith("{")) {
                ObjectNode node = (ObjectNode) mapper.readTree((String) input);
                node.put(fieldName, input.toString());
                return mapper.writeValueAsString(node);
            }

            // Create new JSON object
            ObjectNode node = mapper.createObjectNode();
            if (input == null) {
                node.putNull(fieldName);
            } else if (input instanceof Number) {
                if (input instanceof Integer || input instanceof Long) {
                    node.put(fieldName, ((Number) input).longValue());
                } else {
                    node.put(fieldName, ((Number) input).doubleValue());
                }
            } else if (input instanceof Boolean) {
                node.put(fieldName, (Boolean) input);
            } else {
                node.put(fieldName, input.toString());
            }
            return mapper.writeValueAsString(node);
        } catch (Exception e) {
            throw new RuntimeException("TO_JSON failed: " + e.getMessage(), e);
        }
    }
    public String getFunctionName() { return "TO_JSON"; }
}

/**
 * TO_JSON_ARRAY — appends value to a JSON array.
 *
 * If input is already a JSON array string, appends the new value.
 * If not, creates a new array with the value.
 *
 * Args: optional — if provided, used as a wrapper key.
 *   TO_JSON_ARRAY()        → ["value1", "value2"]
 *   TO_JSON_ARRAY('items') → {"items": ["value1", "value2"]}
 *
 * For Spanner ARRAY columns: chain multiple TO_JSON_ARRAY transforms
 * to build up the array incrementally.
 */
@Component
class ToJsonArrayTransformer implements ColumnTransformer {
    private static final ObjectMapper mapper = new ObjectMapper();

    public Object transform(Object input, String args) {
        try {
            ArrayNode array;

            // If input is already a JSON array, parse it
            if (input instanceof String && ((String) input).trim().startsWith("[")) {
                array = (ArrayNode) mapper.readTree((String) input);
            } else {
                array = mapper.createArrayNode();
                if (input != null) {
                    if (input instanceof Number) {
                        if (input instanceof Integer || input instanceof Long) {
                            array.add(((Number) input).longValue());
                        } else {
                            array.add(((Number) input).doubleValue());
                        }
                    } else if (input instanceof Boolean) {
                        array.add((Boolean) input);
                    } else {
                        array.add(input.toString());
                    }
                }
            }

            // If args specify a wrapper key, wrap in object
            if (args != null && !args.isEmpty()) {
                String key = args.replace("'", "").trim();
                ObjectNode wrapper = mapper.createObjectNode();
                wrapper.set(key, array);
                return mapper.writeValueAsString(wrapper);
            }

            return mapper.writeValueAsString(array);
        } catch (Exception e) {
            throw new RuntimeException("TO_JSON_ARRAY failed: " + e.getMessage(), e);
        }
    }
    public String getFunctionName() { return "TO_JSON_ARRAY"; }
}

// =========================================================================
// ADDITIONAL SYSTEM VALUE GENERATORS
// =========================================================================

/**
 * STATIC_VALUE — always returns the args value, ignoring input entirely.
 * Use for columns that need the same constant for every row (e.g., "STANDARD", "LEGACY").
 *
 * Different from DEFAULT_IF_NULL:
 *   - STATIC_VALUE: ALWAYS returns args, regardless of input
 *   - DEFAULT_IF_NULL: only returns args when input is null, otherwise passes through input
 */
@Component
class StaticValueTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        return args != null ? args.replace("'", "") : "";
    }
    public String getFunctionName() { return "STATIC_VALUE"; }
}

/**
 * CURRENT_DATE — returns today's date without time component.
 * Use for columns like `created_date`, `report_date`.
 */
@Component
class CurrentDateTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        return java.sql.Date.valueOf(java.time.LocalDate.now());
    }
    public String getFunctionName() { return "CURRENT_DATE"; }
}

/**
 * UUID — generates a random UUID v4 string.
 * Use for columns that need unique identifiers.
 */
@Component
class UuidTransformer implements ColumnTransformer {
    public Object transform(Object input, String args) {
        return java.util.UUID.randomUUID().toString();
    }
    public String getFunctionName() { return "UUID"; }
}

/**
 * ROW_NUMBER — returns a sequential counter.
 * Maintains state via a thread-local AtomicLong.
 * Resets when a new pipeline starts (via counter reset mechanism).
 *
 * Args (optional): start value (default 1)
 */
@Component
class RowNumberTransformer implements ColumnTransformer {
    private final java.util.concurrent.atomic.AtomicLong counter = new java.util.concurrent.atomic.AtomicLong(0);

    public Object transform(Object input, String args) {
        return counter.incrementAndGet();
    }
    public String getFunctionName() { return "ROW_NUMBER"; }
}

/**
 * UDF — executes an uploaded Java UDF with dynamic loading, timeout, and failure policies.
 */
@Component
@RequiredArgsConstructor
class UdfTransformer implements ColumnTransformer {

    private final UdfExecutionManager udfExecutionManager;
    private final ObjectMapper objectMapper;
    private final Map<String, UdfConfig> configCache = new ConcurrentHashMap<>();

    @Override
    public Object transform(Object input, String args) {
        return transform(input, args, null, null);
    }

    @Override
    public Object transform(Object input, String args, Map<String, Object> sourceRow) {
        return transform(input, args, sourceRow, null);
    }

    @Override
    public Object transform(Object input, String args, Map<String, Object> sourceRow, String targetColumn) {
        if (args == null || args.isBlank()) {
            return input;
        }

        UdfConfig config = configCache.computeIfAbsent(args, a -> {
            try {
                return objectMapper.readValue(a, UdfConfig.class);
            } catch (Exception e) {
                throw new DatashifterException("Invalid UDF configuration JSON: " + a, e);
            }
        });

        return udfExecutionManager.execute(config, input, sourceRow, targetColumn);
    }

    @Override
    public String getFunctionName() {
        return "UDF";
    }
}