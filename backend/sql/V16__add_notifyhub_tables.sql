-- V16: NotifyHub tables for notification templates, channel configurations, and delivery audit logs

CREATE TABLE IF NOT EXISTS notification_channels (
    id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(36) NOT NULL,
    pipeline_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL, -- EMAIL, SLACK, TEAMS, CLIQ, WEBHOOK
    is_enabled BOOLEAN DEFAULT TRUE,
    config_json TEXT NOT NULL,
    allowed_pipelines_json TEXT,
    created_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notify_channels_org ON notification_channels(org_id);
CREATE INDEX IF NOT EXISTS idx_notify_channels_pipeline ON notification_channels(pipeline_id);

CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    event_type VARCHAR(100), -- PIPELINE_FAILED, PIPELINE_SUCCESS, PIPELINE_WARNING, PIPELINE_STOPPED, CUSTOM
    channel_type VARCHAR(50), -- EMAIL, SLACK, TEAMS, CLIQ, WEBHOOK, or ALL
    subject_template VARCHAR(255),
    body_template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_template_org_name UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_notify_templates_org ON notification_templates(org_id);

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(36) NOT NULL,
    pipeline_id VARCHAR(36),
    event_id VARCHAR(100),
    template_name VARCHAR(100),
    channel_type VARCHAR(50) NOT NULL,
    channel_name VARCHAR(100),
    recipient_or_target VARCHAR(500),
    status VARCHAR(50) NOT NULL, -- PENDING, SENT, FAILED, RETRYING
    attempt_count INT DEFAULT 1,
    error_message TEXT,
    payload_snapshot TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_org ON notification_delivery_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_pipeline ON notification_delivery_logs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON notification_delivery_logs(status);
