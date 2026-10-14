-- ============================================================
-- Migration V18: Change Data Capture (CDC) Support
-- ============================================================

-- 1. Alter pipelines table to support CDC configuration
ALTER TABLE pipelines
    ADD COLUMN IF NOT EXISTS pipeline_mode VARCHAR(20) DEFAULT 'BATCH' NOT NULL,
    ADD COLUMN IF NOT EXISTS cdc_directory_path TEXT,
    ADD COLUMN IF NOT EXISTS cdc_file_pattern VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cdc_starting_scn VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cdc_flush_interval_ms INTEGER DEFAULT 200,
    ADD COLUMN IF NOT EXISTS cdc_batch_size INTEGER DEFAULT 500;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pipelines_mode_check'
    ) THEN
        ALTER TABLE pipelines
            ADD CONSTRAINT pipelines_mode_check CHECK (
                pipeline_mode IN ('BATCH', 'CDC', 'HYBRID')
            );
    END IF;
END $$;

-- 2. Create cdc_checkpoints table for durable offset and SCN tracking
CREATE TABLE IF NOT EXISTS cdc_checkpoints (
    id                  VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pipeline_id         VARCHAR(36)     NOT NULL UNIQUE REFERENCES pipelines(id) ON DELETE CASCADE,
    execution_log_id    VARCHAR(36)     REFERENCES execution_logs(id) ON DELETE SET NULL,
    source_file         VARCHAR(255),
    file_offset         BIGINT          DEFAULT 0,
    last_scn            VARCHAR(50),
    last_lsn            VARCHAR(50),
    tx_id               VARCHAR(100),
    events_processed    BIGINT          DEFAULT 0,
    checkpoint_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status              VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT cdc_checkpoints_status_check CHECK (
        status IN ('ACTIVE', 'PAUSED', 'STOPPED', 'COMPLETED')
    )
);

CREATE INDEX IF NOT EXISTS idx_cdc_checkpoints_pipeline ON cdc_checkpoints(pipeline_id);

-- 3. RBAC Backfill: Grant cdc permissions to Admin and Editor system roles
INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, p.perm, NOW(), NOW()
FROM roles r
CROSS JOIN (
    VALUES
        ('cdc:view'),
        ('cdc:manage')
) AS p(perm)
WHERE r.is_system = true AND r.name = 'Admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = p.perm
  );

INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, p.perm, NOW(), NOW()
FROM roles r
CROSS JOIN (
    VALUES
        ('cdc:view'),
        ('cdc:manage')
) AS p(perm)
WHERE r.is_system = true AND r.name = 'Editor'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = p.perm
  );

INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, 'cdc:view', NOW(), NOW()
FROM roles r
WHERE r.is_system = true AND r.name = 'Viewer'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = 'cdc:view'
  );
