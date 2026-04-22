package com.datashifter.common.enums;

public enum PipelineStatus {
    DRAFT,
    VALIDATED,
    RUNNING,
    PAUSED,
    COMPLETED,
    ERRORED;

    public static PipelineStatus fromString(String status) {

        try {
            return PipelineStatus.valueOf(status.toUpperCase());
        } catch (Exception e) {
            return DRAFT;   // Temporary fallback for unknown status, handle later
        }
    }
}
