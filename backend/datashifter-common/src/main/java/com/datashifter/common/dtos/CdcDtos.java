package com.datashifter.common.dtos;

import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.Map;

public class CdcDtos {
    private CdcDtos() {}

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CdcCheckpointResponse implements Serializable {
        private static final long serialVersionUID = 1L;

        private String id;
        private String pipelineId;
        private String executionLogId;
        private String sourceFile;
        private Long fileOffset;
        private String lastScn;
        private String lastLsn;
        private String txId;
        private Long eventsProcessed;
        private Instant checkpointAt;
        private String status;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResetCdcCheckpointRequest implements Serializable {
        private static final long serialVersionUID = 1L;

        private String targetSourceFile;
        private Long targetFileOffset;
        private String targetScn;
        private String targetLsn;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CdcMetricsDto implements Serializable {
        private static final long serialVersionUID = 1L;

        private String pipelineId;
        private String executionLogId;
        private DatabaseType sourceDbType;
        private String currentSourceFile;
        private Long currentFileOffset;
        private String currentScn;
        private String currentLsn;
        private Long lagSeconds;
        private Long totalEventsProcessed;
        private Long insertCount;
        private Long updateCount;
        private Long deleteCount;
        private Long filteredCount;
        private Long eventsPerSec;
        private Instant lastEventTimestamp;
        private Instant lastCheckpointTimestamp;
    }
}
