# Adapter Architecture Revamp — Progress & Decision Log

## Architecture Decisions Summary
1. **Module Hierarchy:**
   - `backend/adapter-sdk`: Pure SPI contracts, annotations, data envelope, zero third-party dependencies.
   - `backend/adapters/`: Multi-module parent aggregator containing:
     - `oracle-reader`, `oracle-writer`, `oracle-gg-reader`
     - `postgres-reader`, `postgres-writer`, `postgres-wal-reader`
     - `filesystem-writer`, `kafka-writer`
2. **Extensible Record Contract (`DataRecord`):**
   - Payload: `Map<String, Object> data`
   - Context Headers: `Map<String, Object> headers` (SCN, LSN, transaction ID, partition, offset, file path)
   - Operation: `RecordOperation` (`READ`, `INSERT`, `UPDATE`, `DELETE`)
   - Pre-image: `Map<String, Object> beforeData`
3. **Dynamic Isolation:**
   - Isolated child-first `URLClassLoader` per adapter in `AdapterExecutionManager`.
4. **Marketplace & Subscriptions:**
   - Global catalog (`marketplace_catalog`).
   - One-time purchase per organization tracked in `org_purchased_adapters`.
   - Integrated with `payment-service`.
   - Private custom adapter JARs supported.
5. **Database Evolutions:**
   - `V20__add_adapter_marketplace.sql` with new tables and `pipelines` adapter columns (`source_adapter_id`, `target_adapter_id`, `source_config`, `target_config`).

---

## Phases Tracker

- [x] **Phase 1: Adapter SDK Core Contracts & Envelope (`adapter-sdk`)** (Completed)
- [x] **Phase 2: Database Schema & Migration (`V20`) and Common Models** (Completed)
- [x] **Phase 3: Aggregator POM & Oracle Reader / Writer Adapters** (Completed)
- [x] **Phase 4: PostgreSQL Reader & Writer Adapters** (Completed)
- [x] **Phase 5: CDC Streaming Adapters (Oracle GG & Postgres WAL)** (Completed)
- [x] **Phase 6: Non-Relational Target Adapters (FileSystem & Kafka Writers)** (Completed)
- [ ] **Phase 7: Generalize UDF Service to Library Service (Adapter Registry)**
- [ ] **Phase 8: Marketplace Catalog & Payment Integration**
- [ ] **Phase 9: Execution Engine Dynamic Adapter Integration**
- [ ] **Phase 10: Service Refactoring, Test Suite & End-to-End Verification**
