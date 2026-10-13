-- ============================================================
-- Migration V14: Add CONNECTION and UDF context types to ai_chat_sessions
-- ============================================================

ALTER TABLE ai_chat_sessions
    DROP CONSTRAINT IF EXISTS ai_chat_sessions_context_check;

ALTER TABLE ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_context_check CHECK (
        context_type::text = ANY (ARRAY[
            'NONE'::character varying,
            'PIPELINE'::character varying,
            'WORKFLOW'::character varying,
            'CONNECTION'::character varying,
            'UDF'::character varying
        ]::text[])
    );

