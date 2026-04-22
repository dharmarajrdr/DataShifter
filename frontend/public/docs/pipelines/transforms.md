# Transforms

Transforms modify source data before writing to the target. They are applied per-column in the order you define them.

## String transforms

### TRIM
Removes leading and trailing whitespace.
```
"  hello world  " → "hello world"
```

### UPPER
Converts to uppercase.
```
"hello" → "HELLO"
```

### LOWER
Converts to lowercase.
```
"HELLO" → "hello"
```

### APPEND
Appends a suffix string.
- **Args:** suffix text
```
"order" + args="_2025" → "order_2025"
```

### PREPEND
Prepends a prefix string.
- **Args:** prefix text
```
"12345" + args="ORD-" → "ORD-12345"
```

### SUBSTRING
Extracts a portion of the string.
- **Args:** `start` and `end` (0-based indices, both required)
```
"hello world" [0,5] → "hello"
```

## Type conversion transforms

### TO_STRING
Converts any value to its string representation.
```
42 → "42"
true → "true"
```

### TO_NUMBER
Parses a string to a number. Returns Long for integers, Double for decimals.
```
"42" → 42
"3.14" → 3.14
```

### TO_BOOLEAN
Converts common representations to boolean.

| Input | Output |
|-------|--------|
| `"true"`, `"yes"`, `"1"`, `"y"`, `"t"`, `"on"` | `true` |
| `"false"`, `"no"`, `"0"`, `"n"`, `"f"`, `"off"` | `false` |
| Any non-zero number | `true` |
| `0` | `false` |

### TO_DATE
Parses a string to a date/timestamp.
- **Args:** date format pattern (optional, auto-detects common formats)
```
"2025-01-15" → 2025-01-15T00:00:00
"15/01/2025" + args="dd/MM/yyyy" → 2025-01-15T00:00:00
```

## Null handling

### DEFAULT_IF_NULL
Returns a default value when the source is null. Passes through non-null values unchanged.
- **Args:** default value
```
null + args="N/A" → "N/A"
"hello" + args="N/A" → "hello"  (unchanged)
```

> **Note:** `DEFAULT_IF_NULL` is different from `STATIC_VALUE`. DEFAULT_IF_NULL only applies when the source is null. STATIC_VALUE always returns the configured value regardless of source.

## System value transforms

These generate values independently of the source data. Used for target-only columns.

| Transform | Output |
|-----------|--------|
| CURRENT_TIMESTAMP | Current date+time |
| CURRENT_DATE | Current date |
| UUID | Random UUID v4 |
| ROW_NUMBER | Sequential counter (1, 2, 3...) |
| STATIC_VALUE | Fixed value from args |

## Chaining transforms

Transforms are applied in sequence. Example chain for a `full_name` column:

```
Source: "  john doe  "
  → TRIM       → "john doe"
  → UPPER      → "JOHN DOE"
  → APPEND("_migrated") → "JOHN DOE_migrated"
```

Each step's output becomes the next step's input.
