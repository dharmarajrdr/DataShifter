package com.datashifter.common.dtos;

import lombok.*;

import java.util.List;

public class TableOrderDtos {
    private TableOrderDtos() {}

    /**
     * Request: user provides a connection ID and list of table names to order.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SmartOrderRequest {
        private String connectionId;
        private List<String> tableNames;
    }

    /**
     * Response: ordered tables + dependency graph + warnings.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SmartOrderResponse {
        /** Tables in dependency-safe order (parents before children) */
        private List<String> orderedTables;

        /** FK dependency edges (for visual rendering in UI) */
        private List<DependencyEdge> dependencies;

        /** Warnings (e.g., cycles detected, tables not in source) */
        private List<OrderWarning> warnings;

        /** Whether a cycle was detected */
        private boolean hasCycle;

        /** Tables involved in cycles (if any) */
        private List<String> cycleNodes;
    }

    /**
     * Validate an existing user order against FK dependencies.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ValidateOrderRequest {
        private String connectionId;
        private List<String> tableNames; // in user's current order
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ValidateOrderResponse {
        private boolean valid;
        private List<OrderWarning> warnings;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DependencyEdge {
        /** Table that has the FK (child / dependent) */
        private String childTable;
        /** Table being referenced (parent) */
        private String parentTable;
        /** FK column in the child table */
        private String fkColumn;
        /** Referenced column in the parent table */
        private String referencedColumn;
        /** FK constraint name */
        private String constraintName;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OrderWarning {
        private String childTable;
        private String parentTable;
        private String message;
        private String severity; // INFO, WARNING, ERROR
    }
}