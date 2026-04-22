# Datashifter

**Database migration platform — simplified, visual, scalable.**

Datashifter migrates data from source to target databases with minimal configuration. Even non-technical users can build migration pipelines through a visual UI.

Inspired by [Striim](https://www.striim.com/docs) — same power, simpler config, better UX.

---

## Architecture overview

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  React UI   │────▶│  Gateway Service │────▶│  Pipeline Service │
│  (port 3000)│     │    (port 8080)   │     │    (port 8082)    │
└─────────────┘     └──────────────────┘     └────────┬──────────┘
                            │                         │ Kafka
                            │                         ▼
                    ┌───────▼──────────┐     ┌───────────────────┐
                    │Connector Service │     │  Execution Engine │
                    │   (port 8081)    │     │    (port 8084)    │
                    └──────────────────┘     └────────┬──────────┘
                                                      │ Kafka
                                                      ▼
                                             ┌───────────────────┐
                                             │  Monitor Service  │
                                             │    (port 8083)    │
                                             └───────────────────┘
```

**Tech stack:** Spring Boot 3.2, React 18, PostgreSQL, Kafka, Redis, GCP

---

## Project structure

```
datashifter/
├── frontend/                       # React SPA
│   └── datashifter-ui/
├── backend/
│   ├── pom.xml                     # Parent POM (multi-module)
│   ├── datashifter-common/         # Shared models, DTOs, enums, events, utils
│   ├── connector-service/          # DB connection management + pluggable SPI
│   ├── pipeline-service/           # Pipeline CRUD + state machine + Kafka producer
│   ├── execution-engine/           # Core migration engine + transformers + checkpoint
│   ├── monitor-service/            # Live monitoring + error logs + Kafka consumer
│   ├── gateway-service/            # API gateway (Spring Cloud Gateway)
│   └── sql/                        # PostgreSQL DDL
└── README.md
```

---

## Services

| Service | Port | Responsibility |
|---------|------|---------------|
| **gateway-service** | 8080 | API Gateway, CORS, routing |
| **connector-service** | 8081 | DB connections, schema metadata, pluggable SPI |
| **pipeline-service** | 8082 | Pipeline CRUD, state machine, Kafka job triggers |
| **monitor-service** | 8083 | Live stats (Redis), error logs (Postgres), Kafka consumer |
| **execution-engine** | 8084 | Core migration: read → filter → transform → write |

---

## Connector SPI — adding a new database

The Connector SPI is fully pluggable. To add PostgreSQL support:

1. Create `PostgresConnector.java` implementing `DatabaseConnector`
2. Annotate with `@Component`
3. Return `DatabaseType.POSTGRESQL` from `getSupportedType()`
4. The `ConnectorFactory` auto-discovers it — zero changes to existing code

```java
@Component
public class PostgresConnector implements DatabaseConnector {
    @Override
    public DatabaseType getSupportedType() { return DatabaseType.POSTGRESQL; }
    // ... implement all methods
}
```

---

## Pipeline state machine

```
DRAFT ──────→ VALIDATED ──────→ RUNNING
                                  │
                        ┌─────────┼─────────┐
                        ▼         ▼         ▼
                     PAUSED   COMPLETED  ERRORED
                        │                   │
                        └───────→ RUNNING ←─┘
```

---

## Kafka topics

| Topic | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `pipeline.jobs` | pipeline-service | execution-engine | Start/resume pipeline |
| `pipeline.commands` | pipeline-service | execution-engine | Pause/stop commands |
| `pipeline.progress` | execution-engine | monitor-service | Chunk-level progress |
| `pipeline.errors` | execution-engine | monitor-service | Per-row error events |
| `pipeline.status` | execution-engine | pipeline-service | State transitions |

---

## Database configuration

The metadata store supports **PostgreSQL** (default) and **Oracle**. Switch by updating `application.properties` in each service:

```properties
# PostgreSQL (default)
spring.datasource.url=jdbc:postgresql://localhost:5432/datashifter
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect

# Oracle (swap to this)
spring.datasource.url=jdbc:oracle:thin:@localhost:1521/datashifterdb
spring.datasource.driver-class-name=oracle.jdbc.OracleDriver
spring.jpa.database-platform=org.hibernate.dialect.OracleDialect
```

---

## API response format

All APIs follow a consistent response envelope:

```json
{
  "message": "Success",
  "data": { ... },
  "info": null,
  "status": 200
}
```

---

## Key API endpoints

### Connections (`connector-service`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/connections` | Create connection |
| GET | `/api/v1/connections` | List all connections |
| GET | `/api/v1/connections/{id}` | Get connection |
| PUT | `/api/v1/connections/{id}` | Update connection |
| DELETE | `/api/v1/connections/{id}` | Delete connection |
| POST | `/api/v1/connections/{id}/test` | Test connectivity |
| GET | `/api/v1/connections/{id}/tables` | List tables |
| GET | `/api/v1/connections/{id}/tables/{table}` | Table metadata |
| GET | `/api/v1/connections/{id}/tables/{table}/foreign-keys` | FK relationships |

### Pipelines (`pipeline-service`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/pipelines` | Create pipeline |
| GET | `/api/v1/pipelines` | List all pipelines |
| GET | `/api/v1/pipelines/{id}` | Get pipeline detail |
| PUT | `/api/v1/pipelines/{id}` | Update pipeline settings |
| DELETE | `/api/v1/pipelines/{id}` | Delete pipeline |
| POST | `/api/v1/pipelines/{id}/actions` | Start/Pause/Resume/Stop/Validate |

### Monitoring (`monitor-service`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/pipelines/{id}/monitor` | Live stats + in-flight records |
| GET | `/api/v1/pipelines/{id}/errors?page=0&size=20` | Error summary + paginated logs |
| GET | `/api/v1/pipelines/{id}/executions` | Execution history |

---

## Prerequisites

- Java 17+
- Maven 3.8+
- PostgreSQL 15+ (or Oracle 19c+)
- Apache Kafka 3.x
- Redis 7+
- Node.js 18+ (for frontend)

## Quick start

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE datashifter;"
psql -U datashifter -d datashifter -f backend/sql/V1__init_schema.sql

# 2. Start infrastructure
# (ensure Kafka, Redis, PostgreSQL are running)

# 3. Build backend
cd backend
mvn clean install -DskipTests

# 4. Start services (each in its own terminal)
cd gateway-service    && mvn spring-boot:run
cd connector-service  && mvn spring-boot:run
cd pipeline-service   && mvn spring-boot:run
cd monitor-service    && mvn spring-boot:run
cd execution-engine   && mvn spring-boot:run

# 5. Start frontend
cd frontend/datashifter-ui
npm install && npm start
```

---

## Phase roadmap

| Phase | Scope |
|-------|-------|
| **Phase 1** | Bulk migration, Oracle + Spanner, visual UI, transformations, pause/resume |
| **Phase 1.5** | Parallel chunk processing, auto-tune, FK dependency detection |
| **Phase 2** | Auth/RBAC, CDC/event readers, scheduling, data validation, billing, deployment |

---

## License

Proprietary — all rights reserved.
