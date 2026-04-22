# Column mapping

The Column Mapping Board is where you define how source columns map to target columns, including transforms and system values.

## Mapping board

The board shows source columns on the left and target columns on the right. Drag a dot from a source column to a target column to create a mapping.

### Mapping indicators

- **Green dot** — column is mapped
- **Gray dot** — column is unmapped
- **PK** badge (amber) — primary key column
- **\*** badge (red) — NOT NULL column

### Unmapping

Click the green dot on either side to remove a mapping.

## System values

For target columns that don't have a corresponding source column, use **system values**. Click the ⚙ icon on an unmapped target column:

| System value | Output | Use case |
|-------------|--------|----------|
| CURRENT_TIMESTAMP | `2025-01-15T10:30:00Z` | `migrated_at` column |
| CURRENT_DATE | `2025-01-15` | Date-only fields |
| UUID | `a1b2c3d4-...` | Generate unique IDs |
| ROW_NUMBER | `1, 2, 3, ...` | Sequential numbering |
| STATIC_VALUE | Any fixed value | Constants, flags |

System values appear with an amber ⚙ icon. They can be removed from the board or from the transform panel.

## Transform panel

Click a mapped target column to open the transform panel. Transforms are applied in order (pipeline):

```
Source value → Transform 1 → Transform 2 → ... → Target value
```

### Available transforms

| Transform | Args | Example |
|-----------|------|---------|
| TRIM | — | `"  hello  "` → `"hello"` |
| UPPER | — | `"hello"` → `"HELLO"` |
| LOWER | — | `"HELLO"` → `"hello"` |
| APPEND | suffix | `"hello"` + `"_v2"` → `"hello_v2"` |
| PREPEND | prefix | `"US_"` + `"hello"` → `"US_hello"` |
| SUBSTRING | start, end | `"hello world"` → `"hello"` |
| TO_STRING | — | `42` → `"42"` |
| TO_NUMBER | — | `"42"` → `42` |
| TO_DATE | format | `"2025-01-15"` → Date |
| TO_BOOLEAN | — | `"true"` / `"1"` / `"yes"` → `true` |
| TO_JSON | — | Value → JSON string |
| DEFAULT_IF_NULL | default | `null` → `"N/A"` |

### Preview

The transform panel shows a live preview with sample data. Each step shows the input → output so you can verify the transform chain before saving.

### Validation

- SUBSTRING requires both `start` and `end` (must be numbers)
- APPEND, PREPEND, STATIC_VALUE require args
- Invalid steps show a red border with an error message
- The **Apply** button is disabled when validation errors exist
