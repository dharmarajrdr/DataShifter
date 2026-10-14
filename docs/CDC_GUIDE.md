# Change Data Capture (CDC) Architecture & Operations Guide

> **Author**: Senior Staff Database & Distributed Systems Engineer  
> **Target Systems**: Oracle (GoldenGate Trail Files, SCN), PostgreSQL (WAL, LSN)  
> **Datashifter Version**: 2.0+

---

## 1. Executive Summary & Architecture

Change Data Capture (CDC) in **DataShifter** enables continuous, real-time database replication and zero-downtime database migrations. While DataShifter originally performed high-throughput batch snapshot migrations, the CDC engine captures row-level transactional changes (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`) as they occur on the source database and streams them continuously to the target database.

### System Architecture Diagram

```
                        ┌────────────────────────────────────────────────────────┐
                        │          Oracle Source Database Environment             │
                        │  ┌────────────────────┐      ┌──────────────────────┐  │
                        │  │ Oracle Redo Log /  │ ───► │ Extract Process      │  │
                        │  │ Flashback SCN      │      │ (Writes Trail Files) │  │
                        │  └────────────────────┘      └──────────┬───────────┘  │
                        └─────────────────────────────────────────┼──────────────┘
                                                                  │ Trail Files (dirdat/aa*)
                                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Datashifter Execution Engine (:8083) — Continuous Streaming Loop                                │
│                                                                                                  │
│  ┌─────────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────────┐  │
│  │    CdcSourceReader      │ ───► │     Segregation Engine   │ ───► │    CdcReplayCoordinator   │  │
│  │ (OracleTrailFileReader) │      │  - Fast Table Filter    │      │  - Key-based Partitioner │  │
│  │  - Low-level NIO/mmap   │      │  - Row Filters          │      │  - Transaction Boundary  │  │
│  │  - SCN/RBA Tracker      │      │  - Col Transform & UDF  │      │  - Micro-batch Aggregator│  │
│  └───────────┬─────────────┘      └─────────────────────────┘      └────────────┬─────────────┘  │
│              │                                                                  │                │
│              ▼                                                                  ▼                │
│  ┌─────────────────────────┐                                       ┌──────────────────────────┐  │
│  │   CdcCheckpointManager  │                                       │     CdcTargetWriter      │  │
│  │  - Redis (Hot: <5ms)    │                                       │   (Upsert, Update, Del)  │  │
│  │  - Postgres (Durable)   │                                       │   - Oracle / Postgres /  │  │
│  │  - Exact SCN, RBA, XID  │                                       │     Google Spanner       │  │
│  └─────────────────────────┘                                       └────────────┬─────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┼────────────────┘
                                                                                  │
                                                                                  ▼
                                                                     ┌──────────────────────────┐
                                                                     │ Target Database (Sink)   │
                                                                     └──────────────────────────┘
```

---

## 2. Core Concepts

### Canonical Change Event (`CdcEvent`)
All source database transaction logs (Oracle Trail files or Postgres WAL) are converted into a standardized, database-agnostic format:
- **`operationType`**: `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`
- **`position`**: `CdcPosition` with `scn`, `lsn`, `sourceFile`, and byte `offset`
- **`sourceTable` / `targetTable`**: Qualified table and schema identifiers
- **`beforeImage`**: Map of column values before the operation (available for Updates and Deletes)
- **`afterImage`**: Map of column values produced by the operation (available for Inserts and Updates)
- **`transactionId`**: Transaction identifier enabling group commits and atomic boundaries

### Oracle SCN & GoldenGate Trail Files
- **SCN (System Change Number)**: A monotonically increasing 64-bit integer tracking the logical point in time of Oracle database commits.
- **Trail Files**: Sequential binary log files written by Oracle GoldenGate Extract (e.g. `aa000000`, `aa000001`).
- **RBA (Relative Byte Address)**: Byte offset within a specific trail file designating exact record boundaries.

---

## 3. Workflow DAG Hand-off: Snapshot to Continuous Streaming

A common production pattern is **Initial Load followed by CDC Catch-Up**:
1. **Upstream Batch Migration Node**:
   - At snapshot start, the connector executes `SELECT CURRENT_SCN FROM V$DATABASE` (or `pg_current_wal_lsn()` in PostgreSQL).
   - The snapshot SCN is stored in the execution context and attached to the pipeline metadata.
   - Initial table data is chunked and migrated in parallel.
2. **Automatic CDC Hand-off**:
   - When the batch migration pipeline reaches `COMPLETED`, the workflow DAG orchestrator detects downstream CDC nodes.
   - The snapshot SCN is automatically injected as the `cdcStartingScn` for the successor CDC pipeline.
   - The CDC stream begins reading trail files precisely from the snapshot point, ensuring **zero data loss and zero gap in replication**.

---

## 4. Replay Engine & Idempotency

### Micro-batching & Aggregation
To achieve high replication throughput while maintaining transactional consistency:
- Events are partitioned by primary key (`CdcKeyPartitioner`) to guarantee per-row ordering.
- Within a configurable time window (e.g. `200ms`) or count threshold (`500 events`), events are aggregated into micro-batches (`CdcMicroBatchAggregator`).
- Redundant intermediate state changes for the same primary key in a single batch are folded (e.g., `INSERT + UPDATE` becomes a single `INSERT` with latest values).

### Target Dialect Writers
- **Postgres Sink**: Uses `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` for inserts and updates.
- **Oracle Sink**: Uses `MERGE INTO ... USING (SELECT ... FROM DUAL) ... WHEN MATCHED THEN UPDATE ... WHEN NOT MATCHED THEN INSERT ...`.
- **Google Spanner Sink**: Uses mutations with `insertOrUpdate()` semantics.

---

## 5. Dual-Tier Checkpointing & Failure Recovery

1. **Hot Tier (Redis)**:
   - Checkpoint updated every micro-batch commit in `< 5ms`.
   - Tracks `pipelineId`, `sourceFile`, `fileOffset`, `lastScn`, and `eventsProcessed`.
2. **Durable Tier (PostgreSQL `cdc_checkpoints`)**:
   - Persisted periodically or on clean stop/pause.
   - Survives complete infrastructure restart.
3. **Recovery Mechanism**:
   - On crash or restart, `CdcStreamExecutor` queries the checkpoint manager.
   - `OracleTrailFileReader` seeks directly to the recorded `(trail_file, file_offset)` and verifies the SCN.
   - Because target writers operate idempotently, any partially applied batches do not create duplicates.

---

## 6. User Interface Guide

### 1. Creating a CDC Pipeline (Pipeline Wizard)
- In **Pipeline Basics**, choose **CDC Streaming** under Execution Mode.
- Enter the **Trail / WAL Directory Path** (e.g., `/u01/app/oracle/dirdat`).
- Specify the **File Pattern** (default `aa.*`).
- Optionally specify a **Starting SCN** (or leave empty to inherit from snapshot).
- Configure micro-batch size and flush interval.

### 2. Live Monitoring (`/pipelines/:id/monitor`)
- **CDC Streaming Active Beacon**: Pulsating teal badge showing streaming status.
- **Current SCN / LSN**: Displays active replication progress point.
- **Replication Lag Indicator**: Color-coded lag timer (Green `< 5s`, Amber `< 60s`, Red `> 60s`).
- **Throughput Meter**: Real-time events processed per second.
- **Operations Breakdown**: Live counters for Inserts, Updates, Deletes, and Filtered records.

### 3. Pipeline Settings & Checkpoint Reset (`/pipelines/:id/settings`)
- View and adjust CDC parameters.
- Inspect active checkpoint position (Trail File, Byte Offset, Last SCN).
- Use **Reset Checkpoint** to rewind replication to a previous SCN or restart from the beginning.

---

## 7. Future Roadmap: Remote Streaming Agent

Trail files and WAL logs typically reside on remote database hosts. In upcoming releases:
- A lightweight, read-only **DataShifter Remote Agent** will be deployed directly on database hosts.
- The agent streams trail file bytes over high-throughput gRPC directly into DataShifter's `CdcSourceReader` SPI.
- Removes the need for NFS, SSHfs, or periodic file syncing between database servers and the DataShifter host.
