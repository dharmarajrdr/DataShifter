# Connections

Connections define how DataShifter connects to your source and target databases. Each connection stores the host, port, credentials, and schema information needed to read or write data.

## Supported databases

| Database | Read (source) | Write (target) | Status |
|----------|:---:|:---:|--------|
| PostgreSQL | ✓ | ✓ | GA |
| Oracle | ✓ | ✓ | GA |
| Google Cloud Spanner | ✓ | ✓ | Beta |

## Creating a connection

1. Navigate to **Connections** in the sidebar
2. Click **New connection**
3. Fill in the connection details
4. Click **Test connection** to verify

## Connection security

- Passwords are encrypted at rest using AES-256
- Connections are scoped to your organization — other orgs cannot see or use them
- We recommend using **read-only credentials** for source connections

## Connection pooling

Each connection uses a HikariCP pool during migration. Pool sizes are configurable per pipeline in **Pipeline Settings**:

- **Source pool size** — connections for reading (default: 5)
- **Target pool size** — connections for writing (default: 10)

Higher pool sizes increase throughput but consume more database resources. Adjust based on your database capacity.

## Schema browsing

After testing a connection, click **Browse schema** to explore tables and columns. This is useful for understanding the source schema before creating column mappings.
