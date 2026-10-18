<div align="center">

  # DataShifter

  *Next-generation distributed data migration platform with pluggable adapters and visual DAG orchestration.*

  <p align="center">
    <a href="https://github.com/dharmarajrdr/DataShifter/releases/tag/v0.1.0"><img src="https://img.shields.io/badge/version-v0.1.0-blue.svg?style=flat-square" alt="Version" /></a>
    <a href="https://github.com/dharmarajrdr/DataShifter/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square" alt="Build Status" /></a>
    <a href="https://github.com/dharmarajrdr/DataShifter/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" alt="License" /></a>
    <img src="https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F.svg?style=flat-square&logo=springboot" alt="Spring Boot" />
    <img src="https://img.shields.io/badge/React-18-61DAFB.svg?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Apache%20Kafka-3.x-231F20.svg?style=flat-square&logo=apachekafka" alt="Apache Kafka" />
    <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  </p>

  <p align="center">
    <a href="#-getting-started"><strong>Quick Start</strong></a> •
    <a href="#-architecture"><strong>Architecture</strong></a> •
    <a href="https://github.com/dharmarajrdr/DataShifter/issues/new?template=bug_report.md"><strong>Report Bug</strong></a> •
    <a href="https://github.com/dharmarajrdr/DataShifter/issues/new?template=feature_request.md"><strong>Request Feature</strong></a>
  </p>

</div>

---

**DataShifter** is an enterprise-grade distributed data migration and streaming platform designed for data engineers, DevOps teams, and database administrators. It eliminates pipeline downtime and brittle batch ETL scripts by pairing dynamic, isolated adapter plugins with real-time Change Data Capture (CDC) and an intuitive drag-and-drop DAG workflow orchestrator.

### Why DataShifter?
- **Zero-Downtime Extensibility**: Install, upgrade, or remove data connector JARs on-the-fly without restarting execution clusters.
- **Sub-Second Streaming CDC**: Ingest and replicate transactional delta streams directly from database write-ahead logs.
- **Visual DAG Orchestration**: Design complex multi-stage pipeline sequences with live dependency cycle validation.
- **AI-Powered Diagnostics**: Built-in intelligent assistant (**Beetel**) provides automated error root-cause analysis and remediation.

---

## Features

  #### Pluggable Adapter Marketplace
  - **Dynamic ClassLoader Isolation**: Load custom connector JARs inside secure, sandboxed execution boundaries.
  - **Pre-Built Enterprise Adapters**: Native high-throughput connectors for Oracle, PostgreSQL, Kafka, and Filesystems.
  - **In-App Marketplace Hub**: Discover, install, and download signed adapter artifacts with dependency locking.

  #### Real-Time Streaming CDC
  - **WAL & Log Scraping**: Transactional change-data replication using PostgreSQL WAL and Oracle GoldenGate logs.
  - **Event Segregation & Ordering**: Exactly-once partitioned message queuing backed by Apache Kafka.
  - **Auto Replay & Lag Tracking**: Resume streams from historical LSN/SCN checkpoints with zero data loss.

  #### Visual DAG Workflow Orchestration
  - **Interactive DAG Canvas**: Connect pipelines in series or parallel using a modern drag-and-drop interface.
  - **Topological Cycle Prevention**: Real-time graph inspection catches circular references before execution starts.
  - **Granular Pre-Run Validation**: Node-level schema mapping validation prevents unmapped non-nullable column failures.

  #### Live Operations & Observability
  - **Dual-View Dashboards**: Seamlessly toggle between responsive Grid cards and high-density Table list views.
  - **Throughput & Lag Metrics**: Live metrics dashboards powered by Server-Sent Events (SSE) and Redis Pub/Sub.
  - **Audit Logging & Hub**: Centralized alert channels and role-based access management.

---

## Architecture

DataShifter uses an asynchronous microservices topology orchestrated around Kafka and Redis, decoupling gateway traffic from distributed batch and streaming execution engines.

```mermaid
flowchart TD
    subgraph UI ["Frontend Client"]
        Client["Client UI \n (React 18 & Tailwind)"]
    end

    subgraph Ingress ["API Gateway Layer"]
        Gateway["API Gateway \n (Port 8080)"]
    end

    subgraph Services ["Core Microservices Layer"]
        AuthSvc["Auth Service \n (Port 8086)"]
        PipeSvc["Pipeline Service \n (Port 8082)"]
        MonSvc["Monitor Service \n (Port 8083)"]
        UdfSvc["UDF & Marketplace Service \n (Port 8088)"]
        AiSvc["Beetel AI Assistant \n (Port 8089)"]
    end

    subgraph EventAndState ["Event Bus & Storage"]
        Kafka["Apache Kafka \n (Topics: pipeline.jobs / pipeline.commands)"]
        Postgres[("PostgreSQL 15 \n (Metadata & Auth)")]
        Redis[("Redis 7 \n (Pub/Sub & Heartbeat Cache)")]
    end

    subgraph Engine ["Distributed Execution Engine (Port 8084)"]
        EE["Execution Engine Runner"]
        Classloader["Isolated AdapterClassLoader"]
        PoolMgr["Shared Hikari Connection Pool Manager"]

        subgraph Sandboxes ["Pluggable Adapter Sandboxes"]
            PGAdapter["PostgreSQL Reader / Writer / WAL CDC"]
            OracleAdapter["Oracle Reader / Writer / GoldenGate CDC"]
            KafkaAdapter["Kafka Producer Writer"]
            FSAdapter["Filesystem Writer \n (CSV / JSON / Parquet)"]
        end
    end

    Client -->|"HTTP / REST / SSE"| Gateway
    Gateway --> AuthSvc
    Gateway --> PipeSvc
    Gateway --> MonSvc
    Gateway --> UdfSvc
    Gateway --> AiSvc

    Services -->|"Publish Jobs & Commands"| Kafka
    Services -->|"Read / Write State"| Postgres
    Services -->|"Cache & Telemetry"| Redis

    Kafka -->|"Consume Jobs"| EE
    EE --> Classloader
    EE --> PoolMgr
    Classloader --> Sandboxes
    PoolMgr --> Sandboxes

    MonSvc -.->|"SSE Live Stream"| Client
```

---

## 🚀 Getting Started

### Prerequisites
Ensure the following tools are installed on your host:
- **Docker Engine** (v24.0+) & **Docker Compose** (v2.20+)
- **Java Development Kit (JDK 17+)**
- **Node.js** (v18+) & **npm** (v9+)
- **Maven** (v3.9+)

### Quick Start (Docker Compose)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dharmarajrdr/DataShifter.git
   cd DataShifter
   ```

2. **Boot the complete infrastructure & microservices**:
   ```bash
   docker compose -f backend/docker-compose.yml up -d
   ```

3. **Launch the frontend client**:
   ```bash
   cd frontend
   npm install
   npm run start
   ```

4. **Access the application**:
   - Open your browser to `http://localhost:3000`


---

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Tailwind CSS, React Router v6, React Flow (DAG), KaTeX |
| **Backend Services** | Java 17, Spring Boot 3.2, Spring Cloud Gateway, Hibernate/JPA |
| **Messaging & Events**| Apache Kafka (Event Sourcing), Redis 7 (Pub/Sub, Heartbeats) |
| **Data Stores** | PostgreSQL 15 (Metadata & Auth), Oracle 23c Free (Target/Source) |
| **Adapter Framework**| Custom Isolation ClassLoaders, HikariCP Shared Pools, Bytecode Verification |
| **Testing & CI/CD** | JUnit 5, Mockito, Jest, React Testing Library, GitHub Actions |

---

## Contributing

I welcome contributions from the community! Please read our contributing guide before submitting a pull request:

1. **Fork** the repository and clone your fork.
2. Create a topic branch: `git checkout -b feature/amazing-feature`.
3. Ensure all tests pass:
   - Backend: `mvn clean test`
   - Frontend: `npm test -- --watchAll=false`
4. Commit your changes: `git commit -m "feat: add amazing feature"`.
5. Push to your branch: `git push origin feature/amazing-feature`.
6. Open a **Pull Request** targeting the `develop` branch.

---
