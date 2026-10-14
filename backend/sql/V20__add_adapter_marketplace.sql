-- ============================================================
-- Migration V20: Add Adapter Marketplace & Pipeline Extensibility
-- ============================================================

-- 1. Adapter Definitions (Both official marketplace and custom uploaded adapters)
CREATE TABLE IF NOT EXISTS adapter_definitions (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36), -- NULL for system / official marketplace adapters
    created_by_user_id VARCHAR(36),
    name VARCHAR(120) NOT NULL,
    adapter_key VARCHAR(120) NOT NULL,
    description VARCHAR(1000),
    adapter_type VARCHAR(20) NOT NULL, -- READER or WRITER
    supported_mode VARCHAR(20) NOT NULL DEFAULT 'BATCH', -- BATCH, CDC, BOTH
    category VARCHAR(50) NOT NULL DEFAULT 'database',
    version VARCHAR(30) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(20) NOT NULL DEFAULT 'READY',
    class_name VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500),
    artifact_name VARCHAR(255),
    artifact_sha256 VARCHAR(64),
    size_bytes BIGINT DEFAULT 0,
    config_schema TEXT,
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adapter_definitions_org ON adapter_definitions (organization_id);
CREATE INDEX IF NOT EXISTS idx_adapter_definitions_key ON adapter_definitions (adapter_key);

-- 2. Marketplace Catalog (Official adapters available for purchase / installation)
CREATE TABLE IF NOT EXISTS marketplace_catalog (
    id VARCHAR(36) PRIMARY KEY,
    adapter_definition_id VARCHAR(36) REFERENCES adapter_definitions(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    adapter_key VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(2000),
    category VARCHAR(50) NOT NULL DEFAULT 'database',
    adapter_type VARCHAR(20) NOT NULL,
    supported_mode VARCHAR(20) NOT NULL DEFAULT 'BATCH',
    price_paise BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    icon_url VARCHAR(500),
    documentation_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Organization Purchased Adapters (Entitlements)
CREATE TABLE IF NOT EXISTS org_purchased_adapters (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    marketplace_item_id VARCHAR(36) NOT NULL REFERENCES marketplace_catalog(id) ON DELETE CASCADE,
    payment_id VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    amount_paid_paise BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_org_purchased_adapter UNIQUE (organization_id, marketplace_item_id)
);

CREATE INDEX IF NOT EXISTS idx_org_purchased_adapters_org ON org_purchased_adapters (organization_id);

-- 4. Pipeline Table Alterations for Modular Adapters
ALTER TABLE pipelines ALTER COLUMN source_connection_id DROP NOT NULL;
ALTER TABLE pipelines ALTER COLUMN target_connection_id DROP NOT NULL;

ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS source_adapter_id VARCHAR(36);
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS target_adapter_id VARCHAR(36);
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS source_config TEXT;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS target_config TEXT;

-- 5. Seed RBAC Permissions for Roles
INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, id, 'adapter:view', NOW(), NOW() FROM roles WHERE name IN ('Admin', 'Editor', 'Viewer')
ON CONFLICT (role_id, permission) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, id, 'adapter:create', NOW(), NOW() FROM roles WHERE name IN ('Admin', 'Editor')
ON CONFLICT (role_id, permission) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, id, 'adapter:delete', NOW(), NOW() FROM roles WHERE name IN ('Admin', 'Editor')
ON CONFLICT (role_id, permission) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, id, 'adapter:purchase', NOW(), NOW() FROM roles WHERE name = 'Admin'
ON CONFLICT (role_id, permission) DO NOTHING;
