-- ============================================================
-- V3: Namespaces
-- Flat org-wide grouping for pipelines
-- ============================================================

CREATE TABLE namespaces (
    id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color       VARCHAR(20)  DEFAULT '#534AB7',
    created_by  VARCHAR(100),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_namespaces_name ON namespaces (name);

-- Add namespace FK to pipelines
ALTER TABLE pipelines ADD COLUMN namespace_id VARCHAR(36);

-- Add owner/creator field (populated from auth in Phase 2)
ALTER TABLE pipelines ADD COLUMN created_by VARCHAR(100);

-- Seed the Default namespace
INSERT INTO namespaces (id, name, description, color, created_by)
VALUES ('ns-default', 'Default', 'Pipelines not assigned to a specific namespace', '#888780', 'system');

-- Assign all existing pipelines to Default
UPDATE pipelines SET namespace_id = 'ns-default' WHERE namespace_id IS NULL;

-- Add FK constraint
ALTER TABLE pipelines ADD CONSTRAINT fk_pipeline_namespace
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id);

CREATE INDEX idx_pipelines_namespace ON pipelines (namespace_id);