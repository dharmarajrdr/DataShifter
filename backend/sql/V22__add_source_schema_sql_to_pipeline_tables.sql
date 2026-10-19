-- ============================================================
-- V22: Add source_schema_sql to pipeline_tables
-- Stores DDL schema definition for CDC and offline column mapping
-- ============================================================

ALTER TABLE pipeline_tables ADD COLUMN IF NOT EXISTS source_schema_sql TEXT;
