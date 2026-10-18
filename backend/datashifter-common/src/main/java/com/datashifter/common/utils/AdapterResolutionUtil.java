package com.datashifter.common.utils;

import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.PipelineMode;
import com.datashifter.common.exceptions.DatashifterException;

/**
 * Common utility to resolve default reader/writer adapter keys for pipelines (<= 100 lines).
 */
public final class AdapterResolutionUtil {
    private AdapterResolutionUtil() {}

    public static String resolve(String customId, DatabaseType dbType, PipelineMode mode, boolean isSource) {
        if (customId != null && !customId.isBlank()) return customId.trim();
        if (dbType == null) {
            throw new DatashifterException((isSource ? "Source" : "Target") + " adapter or database connection must be specified.");
        }
        if (dbType == DatabaseType.POSTGRESQL) {
            return (mode == PipelineMode.CDC && isSource) ? "postgres-wal-reader" : (isSource ? "postgres-reader" : "postgres-writer");
        } else if (dbType == DatabaseType.ORACLE) {
            return (mode == PipelineMode.CDC && isSource) ? "oracle-gg-reader" : (isSource ? "oracle-reader" : "oracle-writer");
        } else if (dbType == DatabaseType.S3) {
            return isSource ? "filesystem-reader" : "filesystem-writer";
        } else if (dbType == DatabaseType.SPANNER) {
            return isSource ? "spanner-reader" : "spanner-writer";
        }
        throw new DatashifterException("No adapter available for database type: " + dbType);
    }
}
