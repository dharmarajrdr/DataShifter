package com.datashifter.common.dtos;

import com.datashifter.common.enums.ConnectionStatus;
import com.datashifter.common.enums.DatabaseType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.List;

public class ConnectionDtos {
    private ConnectionDtos() {}

    /* ---------- Request ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateConnectionRequest {
        @NotBlank private String name;
        @NotNull  private DatabaseType dbType;
        private String dbVersion;
        @NotBlank private String host;
        private Integer port;
        private String databaseName;
        private String schemaName;
        @NotBlank private String username;
        @NotBlank private String password;
        private String extraProperties;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateConnectionRequest {
        private String name;
        private String host;
        private Integer port;
        private String databaseName;
        private String schemaName;
        private String username;
        private String password;
        private String extraProperties;
    }

    /* ---------- Response ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ConnectionResponse {
        private String id;
        private String name;
        private DatabaseType dbType;
        private String dbVersion;
        private String host;
        private Integer port;
        private String databaseName;
        private String schemaName;
        private ConnectionStatus status;
        private Integer tableCount;
        private Instant lastTestedAt;
        private String lastError;
        private Instant createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TestConnectionResponse {
        private boolean success;
        private String message;
        private Integer tableCount;
        private long latencyMs;
    }

    /* ---------- Schema Metadata ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TableMetadata {
        private String tableName;
        private long estimatedRowCount;
        private List<ColumnMetadata> columns;
        private List<ForeignKeyMetadata> foreignKeys;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ColumnMetadata {
        private String columnName;
        private String dataType;
        private boolean nullable;
        private boolean primaryKey;
        private Integer maxLength;
        private Integer precision;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ForeignKeyMetadata {
        private String constraintName;
        private String columnName;
        private String referencedTable;
        private String referencedColumn;
    }
}
