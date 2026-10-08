CREATE TABLE IF NOT EXISTS udf_definitions (
    id                  VARCHAR(36) PRIMARY KEY,
    organization_id     VARCHAR(36) NOT NULL,
    created_by_user_id   VARCHAR(36) NOT NULL,
    name                VARCHAR(120) NOT NULL,
    description         VARCHAR(1000),
    version             VARCHAR(30) NOT NULL DEFAULT '1.0.0',
    status              VARCHAR(20) NOT NULL DEFAULT 'VALIDATING',
    artifact_name       VARCHAR(255) NOT NULL,
    storage_key         VARCHAR(500) NOT NULL,
    artifact_sha256     VARCHAR(64) NOT NULL,
    size_bytes          BIGINT NOT NULL,
    validation_message  VARCHAR(2000),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_udf_definitions_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_udf_definitions_org ON udf_definitions(organization_id);