# PostgreSQL

DataShifter supports PostgreSQL 12+ as both source and target.

## Connection settings

| Field | Example | Notes |
|-------|---------|-------|
| Host | `localhost` or `db.example.com` | |
| Port | `5432` | Default PostgreSQL port |
| Database | `mydb` | Database name |
| Schema | `public` | Schema containing your tables |
| Username | `datashifter_user` | |
| Password | `••••••••` | Encrypted at rest |

## Recommended source settings

For read-only source connections, create a dedicated user:

```sql
CREATE USER datashifter_reader WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mydb TO datashifter_reader;
GRANT USAGE ON SCHEMA public TO datashifter_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datashifter_reader;
```

## Recommended target settings

For write targets, the user needs INSERT/UPDATE/DELETE:

```sql
CREATE USER datashifter_writer WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mydb TO datashifter_writer;
GRANT USAGE ON SCHEMA public TO datashifter_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO datashifter_writer;
```

## Performance tuning

For maximum throughput on the target, consider these PostgreSQL settings during migration:

| Setting | Value | Effect |
|---------|-------|--------|
| `synchronous_commit` | `off` | 30-50% faster writes |
| `max_connections` | `200+` | Support more pool connections |
| `shared_buffers` | `4GB+` | More memory for writes |

> **Warning:** `synchronous_commit=off` risks losing the last few transactions if PostgreSQL crashes during migration. Re-enable after migration completes.

## Write modes

| Mode | SQL | Use case |
|------|-----|----------|
| INSERT_ONLY | `INSERT INTO ...` | Fresh table, no existing data |
| UPSERT | `INSERT ... ON CONFLICT DO UPDATE` | Incremental/re-runnable migration |
| UPDATE_ONLY | `UPDATE ... WHERE pk = ?` | Update existing rows only |
