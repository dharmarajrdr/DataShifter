-- ============================================================================
-- V15: Seed the "Agent" system role for all existing organizations
-- ============================================================================

DO $$
DECLARE
    org_rec RECORD;
    new_role_id VARCHAR(36);
    perm TEXT;
    agent_perms TEXT[] := ARRAY[
        'pipeline:create', 'pipeline:view', 'pipeline:edit', 'pipeline:delete',
        'pipeline:run', 'pipeline:pause', 'pipeline:stop',
        'workflow:create', 'workflow:view', 'workflow:edit', 'workflow:delete',
        'workflow:run', 'workflow:pause', 'workflow:stop',
        'namespace:create', 'namespace:edit', 'namespace:delete',
        'connection:create', 'connection:view', 'connection:edit', 'connection:delete',
        'connection:test', 'connection:browse_schema',
        'monitor:view', 'monitor:view_errors',
        'settings:edit',
        'udf:create', 'udf:view', 'udf:delete'
    ];
BEGIN
    FOR org_rec IN SELECT id FROM organizations LOOP
        IF NOT EXISTS (
            SELECT 1 FROM roles WHERE org_id = org_rec.id AND LOWER(name) = 'agent'
        ) THEN
            new_role_id := gen_random_uuid()::text;
            INSERT INTO roles (id, org_id, name, description, is_system, created_at, updated_at)
            VALUES (
                new_role_id,
                org_rec.id,
                'Agent',
                lo_from_bytea(0, convert_to('Controls what actions Beetel AI Agent can perform across the organization', 'UTF8')),
                true,
                NOW(),
                NOW()
            );

            FOREACH perm IN ARRAY agent_perms LOOP
                INSERT INTO role_permissions (id, role_id, permission, created_at, updated_at)
                VALUES (gen_random_uuid()::text, new_role_id, perm, NOW(), NOW());
            END LOOP;
        END IF;
    END LOOP;
END $$;

