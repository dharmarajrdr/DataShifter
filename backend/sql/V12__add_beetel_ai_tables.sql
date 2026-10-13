-- ============================================================
-- Migration V12: Beetel AI Agent — API Keys, Chat Sessions, Messages, Execution Plans
-- ============================================================

-- 1. AI API Keys table (Supports User-level and Org-level Groq/Ollama configurations)
CREATE TABLE IF NOT EXISTS ai_api_keys (
    id                  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    scope               VARCHAR(16)  NOT NULL, -- 'USER' or 'ORG'
    user_id             VARCHAR(36)  REFERENCES users(id) ON DELETE CASCADE,
    org_id              VARCHAR(36)  NOT NULL,
    provider            VARCHAR(32)  NOT NULL DEFAULT 'GROQ', -- 'GROQ' or 'OLLAMA'
    label               VARCHAR(120) NOT NULL,
    encrypted_api_key   TEXT,
    masked_key          VARCHAR(64),
    base_url            VARCHAR(255),
    model_name          VARCHAR(120),
    priority_order      INTEGER      NOT NULL DEFAULT 0,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    status              VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'RATE_LIMITED', 'EXPIRED', 'FAILED'
    failure_count       INTEGER      NOT NULL DEFAULT 0,
    last_error          TEXT,
    last_used_at        TIMESTAMP WITH TIME ZONE,
    last_failed_at      TIMESTAMP WITH TIME ZONE,
    cooldown_until      TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ai_api_keys_scope_check CHECK (
        scope::text = ANY (ARRAY['USER'::character varying, 'ORG'::character varying]::text[])
    ),
    CONSTRAINT ai_api_keys_provider_check CHECK (
        provider::text = ANY (ARRAY['GROQ'::character varying, 'OLLAMA'::character varying]::text[])
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_api_keys_user_id ON ai_api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_org_id ON ai_api_keys (org_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_scope_priority ON ai_api_keys (scope, priority_order);

-- 2. AI Chat Sessions table
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id                  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id              VARCHAR(36)  NOT NULL,
    user_id             VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL DEFAULT 'New Beetel Chat',
    context_type        VARCHAR(32)  NOT NULL DEFAULT 'NONE', -- 'NONE', 'PIPELINE', 'WORKFLOW'
    context_id          VARCHAR(36),
    context_name        VARCHAR(255),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ai_chat_sessions_context_check CHECK (
        context_type::text = ANY (ARRAY[
            'NONE'::character varying,
            'PIPELINE'::character varying,
            'WORKFLOW'::character varying
        ]::text[])
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_org ON ai_chat_sessions (user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_context ON ai_chat_sessions (context_type, context_id);

-- 3. AI Execution Plans table (Plan-Confirm-Execute workflow)
CREATE TABLE IF NOT EXISTS ai_execution_plans (
    id                  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id          VARCHAR(36)  NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    org_id              VARCHAR(36)  NOT NULL,
    user_id             VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    summary             TEXT         NOT NULL,
    status              VARCHAR(32)  NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    context_type        VARCHAR(32)  DEFAULT 'NONE',
    context_id          VARCHAR(36),
    steps_json          TEXT         NOT NULL,
    execution_log_json  TEXT,
    result_entity_type  VARCHAR(32),
    result_entity_id    VARCHAR(36),
    confirmed_at        TIMESTAMP WITH TIME ZONE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ai_execution_plans_status_check CHECK (
        status::text = ANY (ARRAY[
            'PENDING_CONFIRMATION'::character varying,
            'APPROVED'::character varying,
            'EXECUTING'::character varying,
            'COMPLETED'::character varying,
            'REJECTED'::character varying,
            'FAILED'::character varying
        ]::text[])
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_execution_plans_session ON ai_execution_plans (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_execution_plans_status ON ai_execution_plans (status);

-- 4. AI Chat Messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id                  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id          VARCHAR(36)  NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role                VARCHAR(32)  NOT NULL, -- 'USER', 'ASSISTANT', 'SYSTEM'
    content             TEXT         NOT NULL,
    markdown_file_name  VARCHAR(255),
    markdown_content    TEXT,
    plan_id             VARCHAR(36)  REFERENCES ai_execution_plans(id) ON DELETE SET NULL,
    provider_used       VARCHAR(64),
    model_used          VARCHAR(120),
    key_source          VARCHAR(32), -- 'USER', 'ORG', 'SYSTEM'
    metadata_json       TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages (session_id, created_at);
