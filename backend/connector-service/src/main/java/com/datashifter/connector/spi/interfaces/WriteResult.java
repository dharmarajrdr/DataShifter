package com.datashifter.connector.spi.interfaces;

import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WriteResult {
    private int totalRecords;
    private int successCount;
    private int failureCount;

    @Builder.Default
    private List<FailedRecord> failedRecords = new ArrayList<>();

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FailedRecord {
        private Map<String, Object> record;
        private String errorMessage;
        private String errorType;
    }
}
