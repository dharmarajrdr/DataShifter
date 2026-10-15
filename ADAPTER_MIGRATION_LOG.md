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
- [x] **Phase 7: Generalize UDF Service to Library Service (Adapter Registry)** (Completed)
- [x] **Phase 8: Marketplace Catalog & Payment Integration** (Completed)
- [x] **Phase 9: Execution Engine Dynamic Adapter Integration** (Completed)
- [x] **Phase 10: Service Refactoring, Test Suite & End-to-End Verification** (Completed)

---

## Phase 10 Summary & Verification
- **Pipeline Service Refactoring:**
  - Extended `PipelineDtos` with `sourceAdapterId`, `targetAdapterId`, `sourceConfig`, `targetConfig`.
  - Refactored `PipelineServiceImpl` creation, update, and import flows to support adapter-based pipelines alongside relational connections.
  - Adapted `MappingService` and `ColumnMappingValidationStep` to validate adapter target pipelines without requiring relational JDBC connections.
- **End-to-End Verification Suite (`AdapterEndToEndFlowTest`):**
  - Verified dynamic classloading, config parsing, engine batch bridge conversion, CDC streaming replication, write result translation, and resource disposal across all adapter SPI implementations.
- **All 10 Phases of Adapter Architecture Revamp are fully implemented, verified, and integrated.**
