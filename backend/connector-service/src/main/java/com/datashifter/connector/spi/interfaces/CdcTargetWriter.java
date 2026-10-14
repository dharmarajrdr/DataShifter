package com.datashifter.connector.spi.interfaces;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcWriteResult;
import com.datashifter.common.enums.DatabaseType;

import java.util.List;

/**
 * Service Provider Interface for target database CDC writers.
 * Applies batches of CDC mutation events (INSERT, UPDATE, DELETE) using idempotent SQL
 * or native mutation APIs for the target database engine.
 */
public interface CdcTargetWriter {

    /** Database type this target writer handles (ORACLE, POSTGRESQL, SPANNER, etc.) */
    DatabaseType getSupportedType();

    /**
     * Applies a batch of CDC events to the target table using idempotent semantics.
     *
     * @param config            target connection configuration
     * @param targetTable       target table name
     * @param events            ordered batch of CDC events for this table
     * @param primaryKeyColumn  primary key column name in the target table
     * @return result summary detailing applied operations and any failures
     */
    CdcWriteResult applyBatch(ConnectionConfig config,
                              String targetTable,
                              List<CdcEvent> events,
                              String primaryKeyColumn);
}
