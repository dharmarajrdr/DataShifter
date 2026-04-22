-- ============================================================
-- DATASHIFTER — PostgreSQL DDL
-- Full metadata store schema
-- ============================================================

-- To use Oracle instead: change data types as noted in comments,
-- replace TEXT with CLOB, BOOLEAN with NUMBER(1), uuid with VARCHAR2(36)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CONNECTIONS
-- ============================================================
CREATE TABLE connections (
    id              VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name            VARCHAR(255)    NOT NULL,
    db_type         VARCHAR(20)     NOT NULL,  -- ORACLE, SPANNER, POSTGRESQL, MONGODB
    db_version      VARCHAR(30),
    host            VARCHAR(500)    NOT NULL,
    port            INTEGER,
    database_name   VARCHAR(255),
    schema_name     VARCHAR(255),
    username        VARCHAR(255)    NOT NULL,
    encrypted_password VARCHAR(512) NOT NULL,
    extra_properties TEXT,                      -- JSON string for additional JDBC props
    status          VARCHAR(20)     NOT NULL DEFAULT 'TESTING',  -- CONNECTED, FAILED, TESTING
    table_count     INTEGER         DEFAULT 0,
    last_tested_at  TIMESTAMP WITH TIME ZONE,
    last_error      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_db_type ON connections(db_type);

-- ============================================================
-- 2. PIPELINES
-- ============================================================
CREATE TABLE pipelines (
    id                      VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name                    VARCHAR(255)    NOT NULL,
    description             TEXT,
    source_connection_id    VARCHAR(36)     NOT NULL REFERENCES connections(id),
    target_connection_id    VARCHAR(36)     NOT NULL REFERENCES connections(id),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    chunk_size              INTEGER         NOT NULL DEFAULT 10000,
    default_write_mode      VARCHAR(20)     NOT NULL DEFAULT 'UPSERT',
    ignore_exceptions       BOOLEAN         NOT NULL DEFAULT FALSE,
    max_error_threshold     INTEGER         NOT NULL DEFAULT 1000,
    log_source_row          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pipelines_status ON pipelines(status);

-- ============================================================
-- 3. PIPELINE TABLES — one entry per source table in a pipeline
-- ============================================================
CREATE TABLE pipeline_tables (
    id              VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    pipeline_id     VARCHAR(36)     NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    source_table    VARCHAR(255)    NOT NULL,
    execution_order INTEGER         NOT NULL,
    mapping_type    VARCHAR(20)     NOT NULL DEFAULT 'ONE_TO_ONE', -- ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pipeline_tables_pipeline ON pipeline_tables(pipeline_id);
CREATE UNIQUE INDEX idx_pipeline_tables_order ON pipeline_tables(pipeline_id, execution_order);

-- ============================================================
-- 4. TARGET TABLE MAPPINGS — supports 1:N (one source → many targets)
-- ============================================================
CREATE TABLE target_table_mappings (
    id                  VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    pipeline_table_id   VARCHAR(36)     NOT NULL REFERENCES pipeline_tables(id) ON DELETE CASCADE,
    target_table        VARCHAR(255)    NOT NULL,
    write_mode          VARCHAR(20)     NOT NULL DEFAULT 'UPSERT',
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_target_mappings_pt ON target_table_mappings(pipeline_table_id);

-- ============================================================
-- 5. COLUMN MAPPINGS — source col → target col per target table
-- ============================================================
CREATE TABLE column_mappings (
    id                      VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    target_table_mapping_id VARCHAR(36)     NOT NULL REFERENCES target_table_mappings(id) ON DELETE CASCADE,
    source_column           VARCHAR(255)    NOT NULL,
    source_type             VARCHAR(50),
    target_column           VARCHAR(255)    NOT NULL,
    target_type             VARCHAR(50),
    mapping_order           INTEGER         NOT NULL,
    default_value           VARCHAR(500),   -- for unmapped target columns (M < N)
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_column_mappings_ttm ON column_mappings(target_table_mapping_id);

-- ============================================================
-- 6. TRANSFORMATIONS — function chain per column mapping
-- ============================================================
CREATE TABLE transformations (
    id                  VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    column_mapping_id   VARCHAR(36)     NOT NULL REFERENCES column_mappings(id) ON DELETE CASCADE,
    function_name       VARCHAR(30)     NOT NULL,  -- TRIM, TO_STRING, TO_DATE, etc.
    arguments           TEXT,                       -- function args as string
    execution_order     INTEGER         NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transformations_cm ON transformations(column_mapping_id);

-- ============================================================
-- 7. FILTERS — row-level source table filters
-- ============================================================
CREATE TABLE filters (
    id                  VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    pipeline_table_id   VARCHAR(36)     NOT NULL REFERENCES pipeline_tables(id) ON DELETE CASCADE,
    column_name         VARCHAR(255)    NOT NULL,
    operator            VARCHAR(30)     NOT NULL,  -- EQUALS, NOT_NULL, GT, LT, IN, LIKE, etc.
    value               TEXT,                       -- comparison value; NULL for IS_NULL/NOT_NULL
    logical_operator    VARCHAR(5)      DEFAULT 'AND', -- AND, OR
    filter_order        INTEGER         NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_filters_pt ON filters(pipeline_table_id);

-- ============================================================
-- 8. EXECUTION LOGS — one record per pipeline run
-- ============================================================
CREATE TABLE execution_logs (
    id                      VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    pipeline_id             VARCHAR(36)     NOT NULL REFERENCES pipelines(id),
    status                  VARCHAR(20)     NOT NULL,
    started_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at            TIMESTAMP WITH TIME ZONE,
    total_rows_processed    BIGINT          DEFAULT 0,
    total_errors            BIGINT          DEFAULT 0,
    current_table           VARCHAR(255),
    current_table_index     INTEGER,
    duration_ms             BIGINT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exec_logs_pipeline ON execution_logs(pipeline_id);
CREATE INDEX idx_exec_logs_status ON execution_logs(status);

-- ============================================================
-- 9. CHUNK CURSORS — checkpoints for pause/resume
-- ============================================================
CREATE TABLE chunk_cursors (
    id                      VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    pipeline_id             VARCHAR(36)     NOT NULL REFERENCES pipelines(id),
    execution_log_id        VARCHAR(36)     REFERENCES execution_logs(id),
    table_name              VARCHAR(255)    NOT NULL,
    current_table_index     INTEGER,
    last_committed_chunk    BIGINT          DEFAULT 0,
    last_committed_pk       TEXT,
    rows_processed          BIGINT          DEFAULT 0,
    checkpoint_at           TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pipeline_id, table_name)
);

CREATE INDEX idx_cursors_pipeline ON chunk_cursors(pipeline_id);

-- ============================================================
-- 10. ERROR LOGS — failed rows with details
-- ============================================================
CREATE TABLE error_logs (
    id                  VARCHAR(36)     PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    pipeline_id         VARCHAR(36)     NOT NULL REFERENCES pipelines(id),
    execution_log_id    VARCHAR(36)     REFERENCES execution_logs(id),
    error_type          VARCHAR(30)     NOT NULL,
    source_table        VARCHAR(255)    NOT NULL,
    target_table        VARCHAR(255)    NOT NULL,
    chunk_number        BIGINT,
    row_number          BIGINT,
    error_message       TEXT            NOT NULL,
    source_row_data     TEXT,           -- JSON of the source row that failed
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_error_logs_pipeline ON error_logs(pipeline_id);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_exec ON error_logs(execution_log_id);
