package com.datashifter.adapter.sdk;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Result metrics and diagnostics from an adapter writeBatch or applyBatch invocation.
 */
public class WriteResult implements Serializable {

    private static final long serialVersionUID = 1L;

    private int totalRecords;
    private int successCount;
    private int failureCount;
    private List<FailedRecord> failedRecords;

    public WriteResult() {
        this.failedRecords = new ArrayList<>();
    }

    public WriteResult(int totalRecords, int successCount, int failureCount, List<FailedRecord> failedRecords) {
        this.totalRecords = totalRecords;
        this.successCount = successCount;
        this.failureCount = failureCount;
        this.failedRecords = failedRecords != null ? new ArrayList<>(failedRecords) : new ArrayList<>();
    }

    public static Builder builder() {
        return new Builder();
    }

    public static WriteResult empty() {
        return new WriteResult(0, 0, 0, Collections.emptyList());
    }

    public static WriteResult success(int count) {
        return new WriteResult(count, count, 0, Collections.emptyList());
    }

    public int getTotalRecords() {
        return totalRecords;
    }

    public void setTotalRecords(int totalRecords) {
        this.totalRecords = totalRecords;
    }

    public int getSuccessCount() {
        return successCount;
    }

    public void setSuccessCount(int successCount) {
        this.successCount = successCount;
    }

    public int getFailureCount() {
        return failureCount;
    }

    public void setFailureCount(int failureCount) {
        this.failureCount = failureCount;
    }

    public List<FailedRecord> getFailedRecords() {
        return Collections.unmodifiableList(failedRecords);
    }

    public void setFailedRecords(List<FailedRecord> failedRecords) {
        this.failedRecords = failedRecords != null ? new ArrayList<>(failedRecords) : new ArrayList<>();
    }

    public void addFailedRecord(FailedRecord failedRecord) {
        if (this.failedRecords == null) {
            this.failedRecords = new ArrayList<>();
        }
        this.failedRecords.add(failedRecord);
    }

    public static class FailedRecord implements Serializable {
        private static final long serialVersionUID = 1L;

        private DataRecord record;
        private String errorMessage;
        private String errorType;

        public FailedRecord() {}

        public FailedRecord(DataRecord record, String errorMessage, String errorType) {
            this.record = record;
            this.errorMessage = errorMessage;
            this.errorType = errorType;
        }

        public DataRecord getRecord() {
            return record;
        }

        public void setRecord(DataRecord record) {
            this.record = record;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public void setErrorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
        }

        public String getErrorType() {
            return errorType;
        }

        public void setErrorType(String errorType) {
            this.errorType = errorType;
        }
    }

    public static class Builder {
        private int totalRecords;
        private int successCount;
        private int failureCount;
        private List<FailedRecord> failedRecords = new ArrayList<>();

        public Builder totalRecords(int totalRecords) {
            this.totalRecords = totalRecords;
            return this;
        }

        public Builder successCount(int successCount) {
            this.successCount = successCount;
            return this;
        }

        public Builder failureCount(int failureCount) {
            this.failureCount = failureCount;
            return this;
        }

        public Builder failedRecords(List<FailedRecord> failedRecords) {
            this.failedRecords = failedRecords != null ? failedRecords : new ArrayList<>();
            return this;
        }

        public Builder addFailedRecord(FailedRecord failedRecord) {
            this.failedRecords.add(failedRecord);
            return this;
        }

        public WriteResult build() {
            return new WriteResult(totalRecords, successCount, failureCount, failedRecords);
        }
    }
}
