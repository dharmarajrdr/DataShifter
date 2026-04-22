# Oracle

DataShifter supports Oracle 12c+ as both source and target.

## Connection settings

| Field | Example | Notes |
|-------|---------|-------|
| Host | `oracle.example.com` | |
| Port | `1521` | Default Oracle listener port |
| Database | `ORCL` | SID or service name |
| Schema | `HR` | Owner schema |
| Username | `datashifter_user` | |
| Password | `••••••••` | |

## Service name vs SID

If your Oracle instance uses a **service name** instead of SID, provide it in the Database field. DataShifter auto-detects the connection type.

## Required grants

```sql
-- Source (read-only)
GRANT CREATE SESSION TO datashifter_reader;
GRANT SELECT ANY TABLE TO datashifter_reader;

-- Target (read-write)
GRANT CREATE SESSION TO datashifter_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON schema.table_name TO datashifter_writer;
```

## Data type mapping

When migrating from Oracle to PostgreSQL, DataShifter handles these type conversions automatically:

| Oracle | PostgreSQL | Notes |
|--------|-----------|-------|
| NUMBER(p,s) | NUMERIC(p,s) | Exact precision preserved |
| VARCHAR2(n) | VARCHAR(n) | |
| DATE | TIMESTAMP | Oracle DATE includes time |
| CLOB | TEXT | |
| BLOB | BYTEA | |
| NUMBER(1) | BOOLEAN | Use TO_BOOLEAN transform |

For types that don't auto-convert, use transforms (TO_STRING, TO_NUMBER, TO_DATE, TO_BOOLEAN) in the column mapping board.
