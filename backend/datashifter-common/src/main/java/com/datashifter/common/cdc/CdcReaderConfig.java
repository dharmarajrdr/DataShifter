package com.datashifter.common.cdc;

import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import lombok.*;

import java.io.Serializable;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * Configuration supplied to a CdcSourceReader instance when opening a log stream.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CdcReaderConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    /** ID of the Datashifter pipeline */
    private String pipelineId;

    /** Source database type (ORACLE, POSTGRESQL, etc.) */
    private DatabaseType databaseType;

    /** Source directory where log / trail files reside */
    private String directoryPath;

    /** File match pattern (e.g., 'aa*', 'dircat/aa[0-9]*', or null for default) */
    private String filePattern;

    /** Starting stream position (SCN, LSN, file offset) */
    private CdcPosition startingPosition;

    /** Set of table names to filter (empty = include all) */
    @Builder.Default
    private Set<String> targetTableNames = new LinkedHashSet<>();

    /** Set of allowed CDC operations (empty = allow all) */
    @Builder.Default
    private Set<CdcOperationType> allowedOperations = new LinkedHashSet<>();

    /** Max events per poll batch */
    @Builder.Default
    private int batchSize = 500;

    /** Max poll wait timeout */
    @Builder.Default
    private Duration pollTimeout = Duration.ofMillis(200);

    /** Additional connector or parser properties */
    @Builder.Default
    private Map<String, Object> extraProperties = new LinkedHashMap<>();
}
