package com.datashifter.adapter.sdk.metadata;

import java.io.Serializable;

/**
 * Metadata descriptor for a column discovered in a source or target table.
 */
public class ColumnMetadata implements Serializable {

    private static final long serialVersionUID = 1L;

    private String columnName;
    private String dataType;
    private boolean nullable;
    private boolean primaryKey;
    private Integer maxLength;
    private Integer precision;
    private Integer scale;

    public ColumnMetadata() {}

    public ColumnMetadata(String columnName, String dataType, boolean nullable, boolean primaryKey,
                          Integer maxLength, Integer precision, Integer scale) {
        this.columnName = columnName;
        this.dataType = dataType;
        this.nullable = nullable;
        this.primaryKey = primaryKey;
        this.maxLength = maxLength;
        this.precision = precision;
        this.scale = scale;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getColumnName() {
        return columnName;
    }

    public void setColumnName(String columnName) {
        this.columnName = columnName;
    }

    public String getDataType() {
        return dataType;
    }

    public void setDataType(String dataType) {
        this.dataType = dataType;
    }

    public boolean isNullable() {
        return nullable;
    }

    public void setNullable(boolean nullable) {
        this.nullable = nullable;
    }

    public boolean isPrimaryKey() {
        return primaryKey;
    }

    public void setPrimaryKey(boolean primaryKey) {
        this.primaryKey = primaryKey;
    }

    public Integer getMaxLength() {
        return maxLength;
    }

    public void setMaxLength(Integer maxLength) {
        this.maxLength = maxLength;
    }

    public Integer getPrecision() {
        return precision;
    }

    public void setPrecision(Integer precision) {
        this.precision = precision;
    }

    public Integer getScale() {
        return scale;
    }

    public void setScale(Integer scale) {
        this.scale = scale;
    }

    public static class Builder {
        private String columnName;
        private String dataType;
        private boolean nullable;
        private boolean primaryKey;
        private Integer maxLength;
        private Integer precision;
        private Integer scale;

        public Builder columnName(String columnName) {
            this.columnName = columnName;
            return this;
        }

        public Builder dataType(String dataType) {
            this.dataType = dataType;
            return this;
        }

        public Builder nullable(boolean nullable) {
            this.nullable = nullable;
            return this;
        }

        public Builder primaryKey(boolean primaryKey) {
            this.primaryKey = primaryKey;
            return this;
        }

        public Builder maxLength(Integer maxLength) {
            this.maxLength = maxLength;
            return this;
        }

        public Builder precision(Integer precision) {
            this.precision = precision;
            return this;
        }

        public Builder scale(Integer scale) {
            this.scale = scale;
            return this;
        }

        public ColumnMetadata build() {
            return new ColumnMetadata(columnName, dataType, nullable, primaryKey, maxLength, precision, scale);
        }
    }
}
