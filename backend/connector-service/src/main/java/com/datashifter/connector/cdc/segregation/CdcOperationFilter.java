package com.datashifter.connector.cdc.segregation;

import com.datashifter.common.enums.CdcOperationType;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * Filters CDC events based on operation type (INSERT, UPDATE, DELETE, TRUNCATE).
 * Enables replicating e.g. only INSERTs and UPDATEs, skipping DELETEs.
 * Transaction boundaries (COMMIT, BEGIN) are always permitted through.
 */
@Slf4j
public class CdcOperationFilter {

    private final Set<CdcOperationType> allowedOperations;
    private final boolean passAll;

    public CdcOperationFilter(Collection<CdcOperationType> operations) {
        if (operations == null || operations.isEmpty()) {
            this.allowedOperations = EnumSet.allOf(CdcOperationType.class);
            this.passAll = true;
        } else {
            this.allowedOperations = EnumSet.copyOf(operations);
            this.passAll = false;
        }
    }

    public static CdcOperationFilter of(Collection<CdcOperationType> operations) {
        return new CdcOperationFilter(operations);
    }

    public static CdcOperationFilter of(CdcOperationType... operations) {
        return new CdcOperationFilter(operations != null ? Arrays.asList(operations) : Collections.emptyList());
    }

    public static CdcOperationFilter allowAll() {
        return new CdcOperationFilter(Collections.emptyList());
    }

    public boolean matches(CdcOperationType opType) {
        if (passAll) return true;
        if (opType == null) return false;
        // Never filter transaction boundaries
        if (opType == CdcOperationType.COMMIT || opType == CdcOperationType.BEGIN) {
            return true;
        }
        return allowedOperations.contains(opType);
    }

    public boolean isPassAll() {
        return passAll;
    }

    public Set<CdcOperationType> getAllowedOperations() {
        return Collections.unmodifiableSet(allowedOperations);
    }
}
