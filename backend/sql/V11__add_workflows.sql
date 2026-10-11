-- ============================================================
-- Migration V11: Workflows, Workflow Nodes & Edges, Plan Limits & RBAC Backfill
-- ============================================================

-- 1. Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id                  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id              VARCHAR(36)  NOT NULL,
    namespace_id        VARCHAR(36)  REFERENCES namespaces(id) ON DELETE SET NULL,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    status              VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    current_pipeline_id VARCHAR(36)  REFERENCES pipelines(id) ON DELETE SET NULL,
    created_by          VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT workflows_status_check CHECK (
        status::text = ANY (ARRAY[
            'DRAFT'::character varying,
            'READY'::character varying,
            'RUNNING'::character varying,
            'PAUSED'::character varying,
            'COMPLETED'::character varying,
            'ERRORED'::character varying,
            'FAILED'::character varying,
            'STOPPED'::character varying
        ]::text[])
    )
);

CREATE INDEX IF NOT EXISTS idx_workflows_org_id ON workflows (org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_namespace_id ON workflows (namespace_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows (status);

-- 2. Workflow Nodes table (0-or-1 workflow per pipeline enforced via UNIQUE(pipeline_id) + ON DELETE RESTRICT)
CREATE TABLE IF NOT EXISTS workflow_nodes (
    id               VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workflow_id      VARCHAR(36) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    pipeline_id      VARCHAR(36) NOT NULL UNIQUE REFERENCES pipelines(id) ON DELETE RESTRICT,
    position_x       DOUBLE PRECISION DEFAULT 100.0,
    position_y       DOUBLE PRECISION DEFAULT 80.0,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow_id ON workflow_nodes (workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_pipeline_id ON workflow_nodes (pipeline_id);

-- 3. Workflow Edges table (Supports Series 1:1 connections now, and Parallel 1:N connections later)
CREATE TABLE IF NOT EXISTS workflow_edges (
    id                 VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workflow_id        VARCHAR(36) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    source_pipeline_id VARCHAR(36) NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    target_pipeline_id VARCHAR(36) NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    on_failure_action  VARCHAR(32) NOT NULL DEFAULT 'STOP_WORKFLOW',
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT workflow_edges_failure_action_check CHECK (
        on_failure_action::text = ANY (ARRAY[
            'CONTINUE_PIPELINE'::character varying,
            'STOP_PIPELINE'::character varying,
            'STOP_WORKFLOW'::character varying
        ]::text[])
    ),
    CONSTRAINT uq_workflow_edge_pair UNIQUE (workflow_id, source_pipeline_id, target_pipeline_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_edges_workflow_id ON workflow_edges (workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_source ON workflow_edges (source_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_target ON workflow_edges (target_pipeline_id);

-- 4. Subscription Plans: Add max_workflows column and backfill existing tiers
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_workflows INTEGER DEFAULT 1;

UPDATE plans SET max_workflows = 1  WHERE name = 'Free';
UPDATE plans SET max_workflows = 3  WHERE name = 'Starter';
UPDATE plans SET max_workflows = 15 WHERE name = 'Pro';
UPDATE plans SET max_workflows = 50 WHERE name = 'Business';
UPDATE plans SET max_workflows = -1 WHERE name = 'Enterprise';

-- 5. RBAC Backfill: Grant workflow:* permissions to existing Admin, Editor, and Viewer system roles
INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, p.perm, NOW(), NOW()
FROM roles r
CROSS JOIN (
    VALUES
        ('workflow:create'),
        ('workflow:view'),
        ('workflow:edit'),
        ('workflow:delete'),
        ('workflow:run'),
        ('workflow:pause'),
        ('workflow:stop')
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
        ('workflow:create'),
        ('workflow:view'),
        ('workflow:edit'),
        ('workflow:run'),
        ('workflow:pause'),
        ('workflow:stop')
) AS p(perm)
WHERE r.is_system = true AND r.name = 'Editor'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = p.perm
  );

INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, 'workflow:view', NOW(), NOW()
FROM roles r
WHERE r.is_system = true AND r.name = 'Viewer'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = 'workflow:view'
  );
