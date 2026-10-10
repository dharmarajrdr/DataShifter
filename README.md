# Datashifter

A visual database migration platform that moves data between heterogeneous databases with minimal configuration. Built for teams migrating from legacy systems (Oracle) to modern cloud databases (Google Spanner), handling complex table mappings, column transformations, and large-scale data volumes.

## What it does

- **Visual pipeline builder** — configure source → target table mappings through a drag-and-drop UI, not SQL scripts
- **Flexible mapping** — 1:1, 1:N (split one table into many), and N:1 (merge many tables into one)
- **Column-level transformations** — chain functions like `TRIM → TO_DATE → UPPER` per column mapping
- **Row filtering** — filter source rows before migration using configurable operators
- **Chunk-based processing** — processes large tables in configurable chunks (default 10K rows) with auto-tuning
- **Parallel execution** — split chunk processing across multiple worker threads
- **Pause/resume** — checkpoint-based recovery so migrations can be paused and resumed without data loss
- **Real-time monitoring** — SSE-powered live progress, throughput metrics, and error tracking
- **Multi-tenant RBAC** — organizations, roles, and fine-grained permissions (22 permission types)

## Architecture

Datashifter is a microservices application with 8 backend services, a React frontend, PostgreSQL for metadata, Kafka for event streaming, and Redis for checkpointing.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                          React Frontend (:3000)                      │
  │   Pipeline Dashboard · Monitor · Column Mapping · Settings · Auth    │
  └───────────────────────────────┬─-────────────────────────────────────┘
                                  │ REST + SSE
                                  ▼
  ┌──────────────────── Gateway Service (:8080) ─────────────────────────┐
  │              API routing, CORS, request forwarding                   │
  └──-┬──────────┬──────────┬──────────┬──────────┬───────────┬──────────┘
      │          │          │          │          │           │
      ▼          ▼          ▼          ▼          ▼           ▼
  Connector   Pipeline   Monitor   Execution    Auth     Notification
    :8081      :8082      :8083      :8084      :8086       :8085
      │          │          │          │          │           │
      │          └──── Kafka Topics ───┘          │           │
      │         (jobs, progress, errors, status)  │        (SSE push)
      │                     │                     │           │
      ▼                     ▼                     ▼           │
Oracle/Spanner      PostgreSQL + Redis        PostgreSQL      │
(source/target)     (metadata + cache)       (auth data)      │
                                                              │
                                            Browser ◄────────-┘
                                        (EventSource)
```

### Services

| Service | Port | Responsibility |
|---------|------|----------------|
| `gateway-service` | 8080 | Spring Cloud Gateway — routes API requests, handles CORS |
| `connector-service` | 8081 | Database connections, schema browsing, FK detection, table ordering |
| `pipeline-service` | 8082 | Pipeline CRUD, namespace management, state machine |
| `monitor-service` | 8083 | Stores and serves execution history, progress, and error logs |
| `execution-engine` | 8084 | Core migration engine — read, filter, transform, map, write loop |
| `notification-service` | 8085 | Real-time push via SSE — bridges Kafka events to browser clients |
| `auth-service` | 8086 | Authentication, organizations, roles, invitations, JWT tokens |

### Tech Stack

**Backend:** Java 17, Spring Boot 3.2, Spring Cloud Gateway, Spring Security, Spring Kafka, JPA/Hibernate, Lombok

**Frontend:** React 18, React Router v6, Lucide icons, custom design system (no CSS framework)

**Data:** PostgreSQL (metadata), Apache Kafka (event streaming), Redis (checkpointing + live stats)

**Databases supported:** Oracle 19c (JDBC), Google Cloud Spanner (Java client library)

## Prerequisites

Ensure the following are installed and running before starting:

| Dependency | Version | Purpose |
|------------|---------|---------|
| **Java JDK** | 17+ | Backend services |
| **Maven** | 3.8+ | Backend build |
| **Node.js** | 18+ | Frontend build |
| **npm** | 9+ | Frontend dependency management |
| **PostgreSQL** | 14+ | Metadata database |
| **Apache Kafka** | 3.x | Event streaming between services |
| **Redis** | 7+ | Checkpoint storage and live stats cache |

### Optional (for target/source databases)

| Dependency | When needed |
|------------|-------------|
| **Oracle Database** or Oracle XE | When using Oracle as source/target |
| **Google Cloud SDK** + service account | When using Google Spanner as source/target |

## Setup

### 1. Database

Create the PostgreSQL database and run all migration scripts in order:

```bash
# Create database and user
psql -U postgres -c "CREATE USER datashifter WITH PASSWORD 'datashifter';"
psql -U postgres -c "CREATE DATABASE datashifter OWNER datashifter;"

# Run DDL migrations (in order)
psql -U datashifter -d datashifter -f backend/sql/V1__init_schema.sql
psql -U datashifter -d datashifter -f backend/sql/V2__add_parallel_workers.sql
psql -U datashifter -d datashifter -f backend/sql/V3__add_namespaces.sql
psql -U datashifter -d datashifter -f backend/sql/V4__add_auth.sql
```

### 2. Kafka

Start Kafka with the required topics:

```bash
# Start Zookeeper and Kafka (if not already running)
zookeeper-server-start.sh config/zookeeper.properties &
kafka-server-start.sh config/server.properties &

# Create topics
kafka-topics.sh --create --topic pipeline.jobs --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --create --topic pipeline.commands --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --create --topic pipeline.progress --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --create --topic pipeline.errors --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --create --topic pipeline.status --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

### 3. Redis

Ensure Redis is running on the default port:

```bash
redis-server
# Verify: redis-cli ping → PONG
```

## Running the application

### Backend

Start the entire backend stack (including databases and Kafka) using Docker Compose from the `backend/` directory:

```bash
cd backend
docker-compose up --build -d
```

This will automatically:
1. Build the multi-module Maven project and create Docker images for all 8 services.
2. Start PostgreSQL, Redis, and Kafka (with Zookeeper).
3. Start all services in the correct order.

To view logs for a specific service:
```bash
docker-compose logs -f execution-engine
```

To stop the cluster:
```bash
docker-compose down
```

*(Alternatively, to run services manually without Docker, build with `mvn clean install -DskipTests` and run `mvn spring-boot:run` in each service directory.)*

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend starts on **http://localhost:3000** and proxies API calls to the gateway at **http://localhost:8080**.

Command used to zip entire project for sharing:

```bash
zip -r DataShifter.zip DataShifter -x "*/node_modules/*" "*/.git/*" "*/logs/*" "*/target/*"
```

### Mock mode

The frontend includes a mock data toggle for development without a running backend:

```javascript
// In frontend/src/services/apiClient.js
export const USE_MOCK = true;   // ← mock data, no backend needed
// export const USE_MOCK = false;  // ← real REST calls via Gateway
```

Set `USE_MOCK = true` to use hardcoded mock data (default). Set to `false` when the backend is running.

## Configuration

### Backend service configuration

Each service has its own `application.properties` in `src/main/resources/`. Key settings:

```properties
# Database (all services except gateway and notification)
spring.datasource.url=jdbc:postgresql://localhost:5432/datashifter
spring.datasource.username=datashifter
spring.datasource.password=datashifter

# Kafka (execution-engine, monitor, notification)
spring.kafka.bootstrap-servers=localhost:9092

# Redis (execution-engine, monitor)
spring.data.redis.host=localhost
spring.data.redis.port=6379

# JWT (all services — must use the SAME secret)
datashifter.jwt.secret=datashifter-default-secret-key-change-in-production-env
datashifter.jwt.access-token-expiry-ms=900000         # 15 minutes
datashifter.jwt.refresh-token-expiry-ms=604800000     # 7 days
```

### Gateway routes

All API traffic flows through the gateway. Routes are in `gateway-service/src/main/resources/application.yml`:

```yaml
spring.cloud.gateway.routes:
  - id: connector-service
    uri: http://localhost:8081
    predicates: Path=/api/v1/connections/**
  - id: pipeline-service
    uri: http://localhost:8082
    predicates: Path=/api/v1/pipelines/**,/api/v1/namespaces/**
  - id: monitor-service
    uri: http://localhost:8083
    predicates: Path=/api/v1/pipelines/*/monitor/**,/api/v1/pipelines/*/errors/**
  - id: auth-service
    uri: http://localhost:8086
    predicates: Path=/api/v1/auth/**
  - id: notification-service
    uri: http://localhost:8085
    predicates: Path=/api/v1/stream/**
```

### Frontend configuration

```bash
# Environment variable (optional — defaults to localhost:8080)
REACT_APP_API_BASE=http://localhost:8080/api/v1
```

## API Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/signup` | Public | Create account (3 paths: new org, invite, skip) |
| POST | `/api/v1/auth/login` | Public | Login → access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Public | Refresh expired access token |
| GET | `/api/v1/auth/me` | Bearer | Get current user + effective permissions |
| GET | `/api/v1/auth/roles` | Bearer | List all roles in org |
| POST | `/api/v1/auth/roles` | Bearer | Create a new role |
| PUT | `/api/v1/auth/roles/:id` | Bearer | Update role permissions |
| GET | `/api/v1/auth/members` | Bearer | List org members |
| PUT | `/api/v1/auth/members/:id` | Bearer | Update member role/permissions |
| POST | `/api/v1/auth/invitations` | Bearer | Send invite to email |
| POST | `/api/v1/auth/request-access` | Bearer | Request access to org |

### Pipelines

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/pipelines` | List all pipelines |
| POST | `/api/v1/pipelines` | Create pipeline |
| GET | `/api/v1/pipelines/:id` | Get pipeline by ID |
| PUT | `/api/v1/pipelines/:id` | Update pipeline |
| DELETE | `/api/v1/pipelines/:id` | Delete pipeline |
| POST | `/api/v1/pipelines/:id/actions` | Execute action (START, PAUSE, RESUME, STOP) |

### Connections

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/connections` | List all connections |
| POST | `/api/v1/connections` | Create connection |
| POST | `/api/v1/connections/:id/test` | Test connection |
| GET | `/api/v1/connections/:id/tables` | List tables in schema |
| GET | `/api/v1/connections/:id/tables/:name` | Get table columns and metadata |

### Monitoring

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/pipelines/:id/monitor` | Get live pipeline progress |
| GET | `/api/v1/pipelines/:id/errors` | Get error logs (paginated) |
| GET | `/api/v1/pipelines/:id/executions` | Get execution history |

### Real-time (SSE)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/stream?channels=...&token=...` | Open SSE connection |
| GET | `/api/v1/stream/stats` | Get connection/channel counts |

SSE event types: `CONNECTED`, `PROGRESS`, `STATUS_CHANGE`, `ERROR`

## Auth and permissions

### Signup flows

1. **Create org** — user becomes Admin with all 22 permissions
2. **Join via invite** — user gets the role assigned by the admin who sent the invite
3. **Sign up without org** — user can later create an org or request access

### Permission model

Hybrid RBAC: `effective permissions = role permissions + user grants - user revokes`

22 permissions across 6 groups:

| Group | Permissions |
|-------|-------------|
| Pipelines | `pipeline:create`, `pipeline:view`, `pipeline:edit`, `pipeline:delete`, `pipeline:run`, `pipeline:pause`, `pipeline:stop` |
| Namespaces | `namespace:create`, `namespace:edit`, `namespace:delete` |
| Connections | `connection:create`, `connection:view`, `connection:edit`, `connection:delete`, `connection:test`, `connection:browse_schema` |
| Monitoring | `monitor:view`, `monitor:view_errors` |
| Settings | `settings:edit` |
| Organization | `org:manage_members`, `org:manage_roles`, `org:manage_invites`, `org:view_audit` |

Default roles seeded on org creation: **Admin** (all), **Editor** (create/manage, no org admin), **Viewer** (read-only).

## Execution engine

The core migration loop in `ExecutionServiceImpl` processes tables sequentially, chunks within each table either sequentially or in parallel:

```
For each table (user-defined order):
  │
  ├─ Check checkpoint → skip if already completed
  ├─ Auto-tune chunk size (row count + column width + memory budget)
  │
  └─ For each chunk:
       ├─ Check pause/stop commands
       ├─ READ chunk from source (keyset pagination via PK)
       ├─ FILTER rows (configurable per-table filter chain)
       ├─ For each target table mapping:
       │    ├─ TRANSFORM + MAP columns (chain of 9 functions)
       │    ├─ BUFFER for live monitor (100 record window)
       │    └─ WRITE to target (INSERT_ONLY / UPSERT / UPDATE_ONLY)
       ├─ Save checkpoint (Redis every chunk, Postgres every 50)
       └─ Publish progress event to Kafka
```

### Write modes

| Mode | Behavior |
|------|----------|
| `INSERT_ONLY` | Fail if PK exists in target |
| `UPSERT` | Insert if new, update if PK exists |
| `UPDATE_ONLY` | Only update existing records, skip new |

### Transformation functions

`TRIM`, `TO_STRING`, `TO_DATE`, `TO_NUMBER`, `CONCAT`, `SUBSTRING`, `DEFAULT_IF_NULL`, `UPPER`, `LOWER`

Functions are chainable per column mapping: `TRIM → TO_DATE('yyyy-MM-dd') → DEFAULT_IF_NULL('1970-01-01')`

## Development

### Adding a new database connector

1. Create a new class implementing `DatabaseConnector` in `connector-service/spi/adapters/`
2. Implement all methods: `testConnection`, `listTables`, `getColumns`, `readChunk`, `writeBatch`, etc.
3. Add the new type to `DatabaseType` enum
4. Register it in `ConnectorFactory`

### Adding a new transformation function

1. Add the function name to `TransformFunction` enum
2. Create the implementation class in `execution-engine/strategies/transformers/`
3. Register it in `TransformerFactory`

### Adding a new permission

1. Add the constant to `Permissions.java`
2. Add it to the appropriate preset role list (ALL, EDITOR, VIEWER)
3. Add it to the `PERMISSION_GROUPS` array in `RolesPage.jsx`

## License

Proprietary. All rights reserved.