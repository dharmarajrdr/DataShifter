-- ============================================================
-- Migration V13: Shared AI Chat Conversations & Sender Identity
-- ============================================================

-- 1. Track which organization member sent each chat message
ALTER TABLE ai_chat_messages
    ADD COLUMN IF NOT EXISTS sender_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;

-- Backfill existing USER messages with the session owner's user_id
UPDATE ai_chat_messages m
SET sender_user_id = s.user_id
FROM ai_chat_sessions s
WHERE m.session_id = s.id
  AND m.role = 'USER'
  AND m.sender_user_id IS NULL;

-- 2. Shared conversation members (permanent access within the same organization)
CREATE TABLE IF NOT EXISTS ai_chat_session_members (
    id                  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id          VARCHAR(36)  NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    org_id              VARCHAR(36)  NOT NULL,
    user_id             VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by_user_id  VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_ai_chat_session_member UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_session_members_session ON ai_chat_session_members (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_session_members_user_org ON ai_chat_session_members (user_id, org_id);

