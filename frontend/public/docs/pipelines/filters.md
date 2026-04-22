# Filters

Filters let you skip rows during migration based on column values. Only rows that pass all filters are migrated.

## Adding filters

In the Pipeline Wizard or Column Mapping board, add filters to a source table. Each filter specifies:

- **Column** — which source column to check
- **Operator** — comparison type
- **Value** — the value to compare against

## Operators

| Operator | Description | Example |
|----------|------------|---------|
| `EQUALS` | Exact match | `status = 'ACTIVE'` |
| `NOT_EQUALS` | Not equal | `status != 'DELETED'` |
| `GREATER_THAN` | Greater than | `amount > 100` |
| `LESS_THAN` | Less than | `age < 18` |
| `CONTAINS` | String contains | `email CONTAINS '@gmail'` |
| `NOT_CONTAINS` | String doesn't contain | `name NOT_CONTAINS 'test'` |
| `IS_NULL` | Value is null | `deleted_at IS NULL` |
| `IS_NOT_NULL` | Value is not null | `email IS NOT NULL` |
| `IN` | In a list | `country IN ('US','UK','CA')` |

## Logical operators

When multiple filters are defined, they are combined with **AND** (all must pass) or **OR** (any must pass).

## Examples

### Migrate only active customers
```
Filter: status EQUALS 'ACTIVE'
```

### Migrate orders from 2024 onwards
```
Filter: order_date GREATER_THAN '2024-01-01'
```

### Exclude test data
```
Filter 1: email NOT_CONTAINS '@test.com'  AND
Filter 2: full_name NOT_EQUALS 'Test User'
```

## Performance impact

Filters are applied **after reading** each chunk from the source. They do not generate SQL WHERE clauses — the source query reads all rows, and filtering happens in Java. For large tables where you only need a small subset, consider adding a WHERE clause directly in the source query (future feature).
