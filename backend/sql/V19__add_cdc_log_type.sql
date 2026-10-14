-- ============================================================
-- Migration V19: Add CDC Log Type to Pipelines
-- ============================================================

ALTER TABLE pipelines
    ADD COLUMN IF NOT EXISTS cdc_log_type VARCHAR(50) DEFAULT 'ORACLE_TRAIL';
