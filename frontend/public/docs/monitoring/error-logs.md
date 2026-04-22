# Error logs

When rows fail during migration, DataShifter logs detailed error information for diagnosis.

## Error types

| Type | Description |
|------|-------------|
| **TYPE_MISMATCH** | Source value doesn't match target column type |
| **NOT_NULL_VIOLATION** | Required column received NULL |
| **DUPLICATE_KEY** | Primary key or unique constraint violation |
| **FK_VIOLATION** | Foreign key constraint failed |
| **CHECK_VIOLATION** | Check constraint failed |
| **BATCH_WRITE_FAILED** | Entire batch failed (cascading) |
| **UNKNOWN** | Unclassified database error |

## Error log viewer

Navigate to a pipeline's **Error logs** tab to see all errors. Each entry shows:

- **Error type** — color-coded chip
- **Source → Target table** — which table pair
- **Chunk # / Row #** — where the error occurred
- **Error message** — human-readable description with context
- **Source row data** — the actual data that failed (if "Log source row" is enabled)

## Filtering errors

Use the search bar to filter by primary key, table name, or error message. Use the dropdowns to filter by table pair or error type.

## Exporting

Click **Export** to download errors as CSV or JSON for offline analysis.

## Error handling modes

Configure in **Pipeline Settings → Error handling**:

| Setting | Default | Description |
|---------|---------|-------------|
| Ignore exceptions | `false` | Continue migration when rows fail |
| Max error threshold | `1000` | Stop pipeline after N errors |
| Log source row | `true` | Store the failing row's data |

> **Tip:** For initial migrations, set `Ignore exceptions = true` and `Max error threshold = 10000`. Review errors after completion and fix column mappings/transforms, then re-run.

## Common fixes

| Error | Fix |
|-------|-----|
| Type mismatch: boolean | Add `TO_BOOLEAN` transform |
| Type mismatch: date | Add `TO_DATE` transform with format |
| NOT NULL violation | Add `DEFAULT_IF_NULL` transform or map the column |
| Duplicate key | Switch write mode to `UPSERT` |
