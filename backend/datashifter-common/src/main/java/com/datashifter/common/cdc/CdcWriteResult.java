package com.datashifter.common.cdc;

import lombok.*;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * Result metrics and error details from applying a CDC micro-batch to a target database.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CdcWriteResult implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Total number of CDC events in the micro-batch */
    private int totalEvents;

    /** Number of successfully applied INSERT operations */
    private int appliedInserts;

    /** Number of successfully applied UPDATE operations */
    private int appliedUpdates;

    /** Number of successfully applied DELETE operations */
    private int appliedDeletes;

    /** Number of failed record operations */
    private int failureCount;

    /** List of individual record failures with error diagnosis */
    @Builder.Default
    private List<CdcFailedRecord> failedRecords = new ArrayList<>();

    public int getTotalApplied() {
        return appliedInserts + appliedUpdates + appliedDeletes;
    }

    public boolean isAllSuccessful() {
        return failureCount == 0;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CdcFailedRecord implements Serializable {
        private static final long serialVersionUID = 1L;

        private CdcEvent event;
        private String errorType;
        private String errorMessage;
        private int retryCount;
    }
}
