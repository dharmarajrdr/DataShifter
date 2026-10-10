package com.datashifter.common.enums;

public enum PipelineStatus {
    DRAFT,
    NOT_VALIDATED,
    VALIDATED,
    INVALID,
    RUNNING,
    PAUSED,
    COMPLETED,
    ERRORED;

    public static PipelineStatus fromString(String status) {

        try {
            return PipelineStatus.valueOf(status.toUpperCase());
        } catch (Exception e) {
            return NOT_VALIDATED;   // Fallback for unknown status
        }
    }
}
