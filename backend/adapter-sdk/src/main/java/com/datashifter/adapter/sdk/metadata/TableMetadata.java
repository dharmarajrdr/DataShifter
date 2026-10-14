package com.datashifter.adapter.sdk.metadata;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Metadata descriptor for a table discovered by a SchemaDiscoverer adapter.
 */
public class TableMetadata implements Serializable {

    private static final long serialVersionUID = 1L;

    private String tableName;
    private String schemaName;
    private List<ColumnMetadata> columns;
    private long estimatedRowCount;
    private String primaryKeyColumn;

    public TableMetadata() {
        this.columns = new ArrayList<>();
    }

    public TableMetadata(String tableName, String schemaName, List<ColumnMetadata> columns,
                         long estimatedRowCount, String primaryKeyColumn) {
        this.tableName = tableName;
        this.schemaName = schemaName;
        this.columns = columns != null ? new ArrayList<>(columns) : new ArrayList<>();
        this.estimatedRowCount = estimatedRowCount;
        this.primaryKeyColumn = primaryKeyColumn;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public String getSchemaName() {
        return schemaName;
    }

    public void setSchemaName(String schemaName) {
        this.schemaName = schemaName;
    }

    public List<ColumnMetadata> getColumns() {
        return Collections.unmodifiableList(columns);
    }

    public void setColumns(List<ColumnMetadata> columns) {
        this.columns = columns != null ? new ArrayList<>(columns) : new ArrayList<>();
    }

    public void addColumn(ColumnMetadata column) {
        if (this.columns == null) {
            this.columns = new ArrayList<>();
        }
        this.columns.add(column);
    }

    public long getEstimatedRowCount() {
        return estimatedRowCount;
    }

    public void setEstimatedRowCount(long estimatedRowCount) {
        this.estimatedRowCount = estimatedRowCount;
    }

    public String getPrimaryKeyColumn() {
        return primaryKeyColumn;
    }

    public void setPrimaryKeyColumn(String primaryKeyColumn) {
        this.primaryKeyColumn = primaryKeyColumn;
    }

    public static class Builder {
        private String tableName;
        private String schemaName;
        private List<ColumnMetadata> columns = new ArrayList<>();
        private long estimatedRowCount;
        private String primaryKeyColumn;

        public Builder tableName(String tableName) {
            this.tableName = tableName;
            return this;
        }

        public Builder schemaName(String schemaName) {
            this.schemaName = schemaName;
            return this;
        }

        public Builder columns(List<ColumnMetadata> columns) {
            this.columns = columns != null ? columns : new ArrayList<>();
            return this;
        }

        public Builder addColumn(ColumnMetadata column) {
            this.columns.add(column);
            return this;
        }

        public Builder estimatedRowCount(long estimatedRowCount) {
            this.estimatedRowCount = estimatedRowCount;
            return this;
        }

        public Builder primaryKeyColumn(String primaryKeyColumn) {
            this.primaryKeyColumn = primaryKeyColumn;
            return this;
        }

        public TableMetadata build() {
            return new TableMetadata(tableName, schemaName, columns, estimatedRowCount, primaryKeyColumn);
        }
    }
}
