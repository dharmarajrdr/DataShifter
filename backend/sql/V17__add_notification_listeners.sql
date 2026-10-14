-- V17: Add notification_listeners table and generalize allowed_resources_json in notification_channels

CREATE TABLE IF NOT EXISTS notification_listeners (
    id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(36) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- PIPELINE, WORKFLOW, UDF, CONNECTION, SETUP, BEETEL
    event_action VARCHAR(50) NOT NULL,  -- COMPLETED, FAILED, STARTED, REMOVED, CREATED, EDITED, UPDATED
    event_key VARCHAR(100) NOT NULL,    -- e.g. "pipeline.completed", "udf.removed", "connection.edited"
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    is_enabled BOOLEAN DEFAULT TRUE,
    channel_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36),
    filter_resource_id VARCHAR(100),    -- optional single resource id
    target_resource_ids_json TEXT,      -- list of resources to listen to (or ["ALL"])
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notify_listeners_org ON notification_listeners(org_id);
CREATE INDEX IF NOT EXISTS idx_notify_listeners_event ON notification_listeners(event_key);
CREATE INDEX IF NOT EXISTS idx_notify_listeners_channel ON notification_listeners(channel_id);

-- Add allowed_resources_json to notification_channels if not exists
ALTER TABLE notification_channels ADD COLUMN IF NOT EXISTS allowed_resources_json TEXT;
