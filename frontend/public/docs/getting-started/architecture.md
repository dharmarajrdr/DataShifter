# Architecture

DataShifter is built as a set of **8 microservices** communicating via REST, Kafka, and Redis.

## Service map

| Service | Port | Responsibility |
|---------|------|----------------|
| **Gateway** | 8080 | API gateway, request routing, CORS |
| **Auth** | 8086 | Signup, login, JWT, RBAC, org management |
| **Connector** | 8081 | Database connections, schema introspection, read/write |
| **Pipeline** | 8082 | Pipeline CRUD, column mappings, namespaces |
| **Execution Engine** | 8084 | Chunk loop, transforms, filters, batch writes |
| **Monitor** | 8083 | Live stats, error logs, Redis stats cache |
| **Notification** | 8085 | SSE delivery, Kafka → browser events |

## Data flow

```
┌────────-─┐     ┌─────────-──┐     ┌──────────────┐     ┌───────────┐
│ Frontend │────▶│  Gateway   │────▶│   Services   │────▶│  Postgres │
│ React 18 │◀─── │   :8080    │     │  :8081-8086  │     │  Metadata │
└─────-────┘     └─────────--─┘     └──────────────┘     └───────────┘
                                         │
                                    ┌────┴────┐
                                    │  Kafka  │
                                    └────┬────┘
                                         │
                                  ┌──────┴─────-──┐
                                  │ Notification  │──── SSE ────▶ Browser
                                  │    :8085      │
                                  └─────────────-─┘
```

## Technology stack

- **Backend:** Java 17, Spring Boot 3.2
- **Frontend:** React 18, vanilla CSS (no Tailwind)
- **Database:** PostgreSQL (metadata store)
- **Messaging:** Apache Kafka
- **Cache:** Redis
- **Auth:** JWT (access + refresh tokens)
- **Connection pooling:** HikariCP (configurable per pipeline)

## Multi-tenancy model

DataShifter uses an **Account/User** separation:

- **Account** — one per email. Holds credentials.
- **User** — one per org membership. Holds name, role, permissions.
- **Organization** — tenant boundary. All data (pipelines, connections, namespaces) is scoped to an org via `createdBy.organization`.

A single Account can have Users in multiple organizations, each with different roles and permissions. Org switching is instant — no re-login required.

## Performance

The execution engine processes data in chunks with these optimizations:

1. **HikariCP connection pooling** — reuses DB connections across chunks
2. **Read-ahead pipelining** — reads next chunk while writing current
3. **Batch writes** — `executeBatch()` with `reWriteBatchedInserts=true`
4. **Zero-copy SSE** — progress events flow via Kafka, no Redis in hot path

Result: **150,000+ rows/sec** sustained throughput on localhost PostgreSQL.
