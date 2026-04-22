# DataShifter — Performance Optimization Report

**Date:** April 19, 2026  
**Platform:** DataShifter v0.1.0 — SaaS Database Migration Platform  
**Author:** Engineering Team  
**Classification:** Internal Engineering Report

---

## Executive summary

DataShifter's migration throughput was measured at **~850 rows/sec** — far below the target of 25,000 rows/sec needed for billion-row migrations. After systematic profiling and four targeted fixes, throughput increased to **151,974 rows/sec** — a **178x improvement**. At this rate, 1 billion rows can be migrated in approximately 1.8 hours.

---

## Problem statement

During the migration of 1,010,020 rows from `src_customers` to `tgt_customer_analytics` (PostgreSQL → PostgreSQL, same host), the observed throughput was consistently ~850 rows/sec. At this rate, migrating 100 million rows would take over 32 hours, and 1 billion rows would take over 13 days — making the platform unsuitable for production-scale data migrations.

**Target throughput:** 25,000 rows/sec (1 billion rows in ~11 hours)

---

## Root cause analysis

### Methodology

We instrumented the chunk processing loop with per-step timing to isolate where execution time was being spent. The loop processes data in configurable chunks (default 10,000 rows, tuned down to 5,000 for this table) through the following stages:

```
READ → FILTER → TRANSFORM → BUFFER → WRITE → CHECKPOINT → PUBLISH
```

### Initial profiling results

```
PERF chunk=0 rows=5000: read=27ms filter=1ms transform+write=5031ms checkpoint=21ms publish=8ms TOTAL=5088ms
PERF chunk=1 rows=5000: read=0ms  filter=0ms transform+write=5696ms checkpoint=40ms publish=1ms TOTAL=5737ms
PERF chunk=2 rows=5000: read=0ms  filter=0ms transform+write=5889ms checkpoint=21ms publish=1ms TOTAL=5911ms
PERF chunk=3 rows=5000: read=0ms  filter=0ms transform+write=5941ms checkpoint=10ms publish=0ms TOTAL=5951ms
PERF chunk=4 rows=5000: read=0ms  filter=0ms transform+write=5179ms checkpoint=11ms publish=1ms TOTAL=5191ms
PERF chunk=5 rows=5000: read=0ms  filter=0ms transform+write=5083ms checkpoint=24ms publish=1ms TOTAL=5108ms
PERF chunk=6 rows=5000: read=0ms  filter=0ms transform+write=5108ms checkpoint=10ms publish=1ms TOTAL=5119ms
PERF chunk=7 rows=5000: read=0ms  filter=0ms transform+write=5137ms checkpoint=10ms publish=1ms TOTAL=5148ms
PERF chunk=8 rows=5000: read=0ms  filter=0ms transform+write=5012ms checkpoint=11ms publish=1ms TOTAL=5024ms
PERF chunk=9 rows=5000: read=0ms  filter=0ms transform+write=4994ms checkpoint=8ms  publish=2ms TOTAL=5004ms
```

### Key observations from the profiling data

| Step | Time (avg) | % of total | Assessment |
|------|-----------|------------|------------|
| Read | 0–27ms | < 1% | Fast (read-ahead was already active) |
| Filter | 0–1ms | < 0.1% | Negligible |
| Transform + Write | ~5,200ms | **99%** | Critical bottleneck |
| Checkpoint | 8–40ms | < 1% | Acceptable |
| Publish | 0–8ms | < 0.1% | Negligible |

**99% of execution time was inside the `transform+write` block**, averaging ~5,200ms per chunk of 5,000 rows. This translates to approximately 1ms per row — consistent with the observed ~1,000 rows/sec throughput.

---

## Bottlenecks identified and fixes applied

### Bottleneck 1: New JDBC connection per chunk

**Severity:** High  
**Component:** `PostgresConnector.getConnection()`  
**Impact on throughput:** Masked by Bottleneck 3, contributed ~12–32 seconds per pipeline execution

Every call to `readChunk()` and `writeBatch()` invoked `DriverManager.getConnection()`, which opens a new TCP socket, performs TLS negotiation, and authenticates with PostgreSQL on every single invocation. For a 1M row table with 5,000 row chunks, this resulted in approximately 400 connection establishments (200 reads + 200 writes), each costing 30–80ms.

**Fix applied:** Introduced `ConnectionPoolManager` — a HikariCP-based connection pool that maintains 10 persistent connections per database. Connections are acquired from the pool in < 1ms instead of 30–80ms. The pool is created once per `connectionId` and reused across all chunks and pipeline executions.

```java
// Before: new TCP + TLS + auth every call
Connection conn = DriverManager.getConnection(url, user, pass); // 30-80ms

// After: borrow from warm pool
Connection conn = poolManager.getConnection(config); // <1ms
```

**HikariCP configuration:**

- Max pool size: 10 connections
- Min idle: 2 connections (avoid cold start)
- Idle timeout: 5 minutes
- Max lifetime: 25 minutes
- Prepared statement cache enabled

---

### Bottleneck 2: Sequential read-write pattern

**Severity:** Medium  
**Component:** `ExecutionServiceImpl.executeChunkLoop()`  
**Impact on throughput:** Masked by Bottleneck 3, eliminated read wait time entirely

The chunk loop was fully sequential: read chunk N, process it, write it, then start reading chunk N+1. During the write phase (the longest step), the source database connection sat completely idle.

**Fix applied:** Implemented read-ahead pipeline using `CompletableFuture.supplyAsync()`. While chunk N is being transformed and written, chunk N+1 is read in parallel on a separate thread.

```java
// Kick off next read while current chunk is being processed
readAheadFuture = CompletableFuture.supplyAsync(() ->
    sourceConnector.readChunk(config, table, pk, lastPk, chunkSize)
);
```

This is confirmed working in the profiling output: `read=0ms` for chunks 1–9 means the read-ahead completed before the previous chunk finished processing.

Additionally, `getEstimatedRowCount()` was being called inside the loop on every chunk iteration, causing an unnecessary database round-trip per chunk. This was moved outside the loop (called once before entering).

---

### Bottleneck 3: In-flight buffer Redis storm (the 99% bottleneck)

**Severity:** Critical  
**Component:** `InFlightBufferService.pushRecords()`  
**Impact on throughput:** ~5,000ms per chunk — directly responsible for the ~850 rows/sec ceiling

This was the dominant bottleneck, responsible for ~99% of the `transform+write` time.

The `InFlightBufferService` maintained a Redis list of the most recent 100 migrated records for the Live Monitor UI's real-time data preview. The original implementation pushed **every record** in the chunk to Redis individually, then trimmed to 100:

```java
// BEFORE: 5000 records → 5000 Redis leftPush calls + 1 trim = 5001 Redis round-trips
for (Map<String, Object> record : records) {        // 5000 iterations
    String json = objectMapper.writeValueAsString(record);  // serialize each
    redisTemplate.opsForList().leftPush(key, json);          // ~1ms per call
}
redisTemplate.opsForList().trim(key, 0, 99);  // keep only 100
```

Each `leftPush` is a synchronous Redis command requiring a network round-trip (~1ms on localhost). For a 5,000-row chunk, this produced **5,001 Redis commands per chunk**, consuming approximately **5 seconds** — which exactly matches the profiled `transform+write=5,031ms`.

The irony: 4,900 of those 5,000 records were immediately discarded by the `trim` operation. Only the last 100 records were ever visible in the UI.

**Fix applied:** Reduced to only serializing and pushing the last 100 records, using a single bulk Redis operation:

```java
// AFTER: 5000 records → take last 100 → 1 delete + 1 rightPushAll = 2 Redis commands
int start = Math.max(0, records.size() - 100);
List<Map<String, Object>> tail = records.subList(start, records.size());

String[] jsonArray = new String[tail.size()];
for (int i = 0; i < tail.size(); i++) {
    jsonArray[i] = objectMapper.writeValueAsString(tail.get(i));
}

redisTemplate.delete(key);
redisTemplate.opsForList().rightPushAll(key, jsonArray);
```

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Records serialized per chunk | 5,000 | 100 | 50x |
| Redis commands per chunk | 5,001 | 2 | 2,500x |
| Time per chunk (buffer step) | ~5,000ms | ~3ms | 1,666x |

**Result after Bottleneck 3 fix:** Throughput jumped from ~850 rows/sec to **126,315 rows/sec** — a **148x improvement**.

---

### Bottleneck 4: Redis in the hot path — unnecessary architecture

**Severity:** Medium  
**Component:** `InFlightBufferService` (entire class), `MonitorServiceImpl.getLiveMonitor()`  
**Impact on throughput:** ~3ms per chunk residual overhead + unnecessary memory usage

After fixing Bottleneck 3 (reducing from 5,001 to 2 Redis commands per chunk), the in-flight buffer was still performing 2 Redis operations per chunk: one `delete` and one `rightPushAll` of 100 serialized JSON records. At 126K rows/sec, this is roughly 25 Redis writes per second — not catastrophic, but entirely unnecessary.

**The fundamental design flaw:** The in-flight records were being written to Redis so the REST endpoint `GET /monitor` could serve them on page refresh. But the same records were already being sent through Kafka → notification-service → SSE to the browser in real-time. Redis was a redundant second delivery path that only served the brief moment between page load and the first SSE event (1–2 seconds).

```
Before (dual path):
  Engine → Redis (serialize 100 + delete + push) → Monitor REST → Frontend (on page load)
  Engine → Kafka (100 records in ProgressEvent) → SSE → Frontend (real-time)

After (single path):
  Engine → Kafka (100 records in ProgressEvent) → SSE → Frontend (real-time)
  Monitor REST → returns empty list (SSE populates within 1-2 seconds)
```

**Fix applied:**

1. **Removed `InFlightBufferService`** from the chunk loop entirely — no more Redis calls during migration
2. **Removed `inFlightBuffer` dependency** from `ExecutionServiceImpl` and `ParallelChunkProcessor`
3. **Updated `MonitorServiceImpl.getLiveMonitor()`** to return `List.of()` for in-flight records instead of reading from Redis
4. **Frontend already handles this** — the SSE `onProgress` handler populates `inflightRecords` from the progress event payload, which arrives within 1–2 seconds of page load for any running pipeline

**Trade-off:** On page refresh for a running pipeline, in-flight records show empty for 1–2 seconds until the first SSE event arrives. This is an acceptable trade-off: zero overhead on every chunk vs a brief empty state that self-resolves.

**Files changed:**

| File | Change |
|------|--------|
| `ExecutionServiceImpl.java` | Removed all `inFlightBuffer` calls and field |
| `ParallelChunkProcessor.java` | Removed `inFlightBuffer` dependency |
| `MonitorServiceImpl.java` | Returns `List.of()` for inflight records (SSE delivers them) |
| `InFlightBufferService.java` | Can be deleted — no longer referenced |

**Result after Bottleneck 4 fix:** Throughput improved from 126,315 rows/sec to **151,974 rows/sec** — an additional **20% improvement**.

---

## Final results

### Throughput progression across all four fixes

| Stage | Throughput | Multiplier | Key change |
|-------|-----------|------------|------------|
| Original baseline | 850/sec | 1x | DriverManager + 5001 Redis calls/chunk |
| + HikariCP + batch + read-ahead | 1,050/sec | 1.2x | Gains masked by Redis bottleneck |
| + Redis buffer fix (5001→2 calls) | 126,315/sec | 148x | Eliminated 99% of chunk processing time |
| + Redis removed from hot path | **151,974/sec** | **178x** | Zero Redis overhead in migration loop |

### Final performance metrics

| Metric | Value |
|--------|-------|
| Rows processed | 1,010,020 |
| Rows/sec (instantaneous) | 151,974 |
| Avg rows/sec (sustained) | 151,974 |
| Projected time for 100M rows | ~11 minutes |
| Projected time for 1B rows | **~1.8 hours** |
| Projected time for 10B rows | ~18.3 hours |

### Time distribution after all optimizations

| Step | Time (estimated) | % of total |
|------|-----------------|------------|
| Read | 0ms (read-ahead) | 0% |
| Filter | <1ms | <1% |
| Transform + Map | ~10ms | ~30% |
| Write (batch) | ~20ms | ~60% |
| Checkpoint | ~3ms | ~9% |
| Publish (Kafka) | <1ms | <1% |

---

## Files changed (complete list)

| File | Service | Change |
|------|---------|--------|
| `ConnectionPoolManager.java` | connector-service | **New** — HikariCP pool manager |
| `PostgresConnector.java` | connector-service | Replaced `DriverManager` with pooled connections |
| `ExecutionServiceImpl.java` | execution-engine | Read-ahead pipeline, removed Redis buffer, per-chunk timing |
| `InFlightBufferService.java` | execution-engine | **Deleted** — replaced by direct Kafka → SSE delivery |
| `ParallelChunkProcessor.java` | execution-engine | Removed `InFlightBufferService` dependency |
| `MonitorServiceImpl.java` | monitor-service | Removed Redis inflight reads, returns empty list |

---

## Lessons learned

1. **Profile before optimizing.** The initial assumption was that JDBC connection overhead or batch write performance was the bottleneck. Without per-step timing, we would have spent effort optimizing the wrong component. The actual bottleneck (Redis buffer) was in a seemingly innocuous 10-line utility class.

2. **Beware of O(N) operations in hot paths.** The in-flight buffer iterated over every record in the chunk despite only needing the last 100. In a data pipeline where N = chunk size, any per-record operation in the processing loop multiplies directly against throughput.

3. **Redis round-trips are expensive even on localhost.** Each synchronous Redis command costs ~1ms due to protocol overhead, even with no network latency. 5,000 sequential commands = 5 seconds. Batching (using `rightPushAll`, `pipeline()`, or Lua scripts) should always be the default approach when pushing multiple values.

4. **Question the architecture before optimizing the implementation.** Bottleneck 4 demonstrated that after fixing the Redis call volume (Bottleneck 3), the right answer wasn't "fewer Redis calls" — it was "why are we using Redis here at all?" The data was already flowing through Kafka → SSE. Redis was a redundant path serving a 1–2 second window on page refresh. Removing it entirely gave another 20% improvement with zero functional loss.

5. **Optimization wins can be masked.** The connection pool and read-ahead fixes were working correctly (confirmed by `read=0ms` in profiling) but their throughput gains were invisible because the Redis bottleneck dominated. All four fixes were necessary, but only Bottleneck 3 produced the dramatic visible change. Without Bottlenecks 1 and 2 already fixed, the post-Redis-fix throughput would have been lower.

6. **Instrument early, instrument always.** The per-step `PERF chunk=N` logging added during debugging should be retained (at debug level) as a permanent diagnostic tool. When throughput degrades in the future, this data immediately identifies the responsible step.

---

## Recommendations for future optimization

1. **Parallel chunk writes** — Currently single-threaded. For tables with independent rows (no FK dependencies), processing multiple chunks simultaneously using a thread pool could provide an additional 2–4x improvement.

2. **COPY protocol for PostgreSQL** — The `INSERT ... VALUES` approach, even with `reWriteBatchedInserts=true`, still parses SQL. PostgreSQL's `COPY` binary protocol can achieve 200K+ rows/sec by streaming raw tuples directly into the table buffer.

3. **Disable indexes during bulk load** — For large migrations into empty tables, dropping secondary indexes before loading and recreating them after is significantly faster than maintaining them during each insert.

4. **Target-side connection tuning** — `synchronous_commit=off` and `wal_level=minimal` on the target PostgreSQL instance during migration can reduce write latency by 30–50% at the cost of crash durability during the migration window.

---

*Report generated from DataShifter execution-engine profiling data, April 19, 2026.*