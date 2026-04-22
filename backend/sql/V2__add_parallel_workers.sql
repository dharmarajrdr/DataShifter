-- ============================================================
-- V2: Add parallel_workers column to pipelines
-- Allows per-pipeline worker count override.
-- 0 or NULL = use system default from application.properties
-- ============================================================

ALTER TABLE pipelines ADD COLUMN parallel_workers INTEGER DEFAULT 0;

COMMENT ON COLUMN pipelines.parallel_workers IS 'Number of parallel worker threads. 0 = use system default.';