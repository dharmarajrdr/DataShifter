-- ============================================================
-- V21: Synchronize pipeline:edit and pipeline:column-mapping permissions
-- Ensures all roles that have either permission receive both.
-- ============================================================

-- Grant pipeline:edit to all roles having pipeline:column-mapping
INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, 'pipeline:edit', NOW(), NOW()
FROM roles r
WHERE EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = 'pipeline:column-mapping'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = 'pipeline:edit'
);

-- Grant pipeline:column-mapping to all roles having pipeline:edit
INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
SELECT gen_random_uuid()::text, r.id, 'pipeline:column-mapping', NOW(), NOW()
FROM roles r
WHERE EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = 'pipeline:edit'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = 'pipeline:column-mapping'
);
