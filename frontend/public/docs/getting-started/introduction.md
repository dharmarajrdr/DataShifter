# Introduction

DataShifter is an enterprise-grade **database migration platform** that moves data between heterogeneous databases at scale. It supports Oracle, PostgreSQL, and Google Cloud Spanner — with more connectors coming soon.

## What DataShifter does

DataShifter handles **data-only migration** — moving rows from source tables to target tables with optional transformations, filtering, and column remapping. It does not migrate schema (DDL). Your target tables must already exist.

## Key capabilities

### Visual pipeline builder
Create migration pipelines through an intuitive drag-and-drop interface. Map source columns to target columns, add transforms, set filters — all without writing SQL.

### Real-time monitoring
Watch your migration in real-time. Track rows/sec throughput, see in-flight records, monitor errors as they happen via Server-Sent Events (SSE).

### Enterprise performance
DataShifter achieves **150,000+ rows/sec** on PostgreSQL using connection pooling, batch writes, and read-ahead pipelining. A billion-row migration completes in under 2 hours.

### Multi-tenant by design
Built for organizations. Every pipeline, connection, and namespace is scoped to your org. Switch between orgs instantly without re-authenticating.

## How it works

```
Source DB → Read chunks → Filter → Transform → Write batch → Target DB
              ↓                                      ↓
         Live Monitor ← SSE ← Kafka ← Progress Events
```

Each pipeline processes data in configurable chunks (default 10,000 rows). Chunks are read from the source, filtered, transformed column-by-column, and written to the target in batch. Progress is published via Kafka to the Live Monitor in real-time.

## Next steps

- [Quick start](/docs/?page=getting-started%2Fquick-start.md) — Set up your first migration in 5 minutes
- [Architecture](/docs/?page=getting-started%2Farchitecture.md) — Understand the microservices behind DataShifter
