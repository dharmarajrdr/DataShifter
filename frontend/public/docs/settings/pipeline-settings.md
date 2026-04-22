# Pipeline settings

Configure chunk size, write mode, connection pools, error handling, and data privacy per pipeline.

## General

- **Name** — pipeline display name
- **Description** — optional context

## Processing

### Chunk size
Number of rows read per iteration. Default: 10,000.

| Size | Best for |
|------|----------|
| 1,000 | Small tables, complex transforms |
| 10,000 | General purpose (default) |
| 50,000+ | Large tables, simple transforms |

### Default write mode

| Mode | SQL generated | Use case |
|------|--------------|----------|
| INSERT_ONLY | `INSERT INTO ...` | Fresh empty target table |
| UPSERT | `INSERT ... ON CONFLICT DO UPDATE` | Re-runnable, incremental |
| UPDATE_ONLY | `UPDATE ... WHERE pk = ?` | Update existing rows only |

## Connection pool

Control how many database connections DataShifter opens.

- **Source DB connections** (1-20, default 5) — for reading
- **Target DB connections** (1-20, default 10) — for writing

Higher values increase throughput but consume more DB resources.

## Error handling

- **Ignore exceptions** — continue when individual rows fail
- **Max error threshold** — stop pipeline after N cumulative errors
- **Log source row** — store the failing row's data in error logs

## Data privacy

- **Preview in-flight records** — when disabled, the Live Monitor won't show migrating data. Use for sensitive/confidential data.

## Per-table write mode

Override the default write mode for individual source → target pairs. Useful when one table needs INSERT_ONLY while others use UPSERT.

## Table pairs

Add or remove source → target table pairs. Changes take effect on the next pipeline run.
