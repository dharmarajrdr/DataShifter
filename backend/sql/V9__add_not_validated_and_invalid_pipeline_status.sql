-- Migration V9: Add NOT_VALIDATED and INVALID to pipelines check constraint and validation_errors column
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS validation_errors TEXT;

ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_status_check;

ALTER TABLE pipelines ADD CONSTRAINT pipelines_status_check CHECK (
    status::text = ANY (ARRAY[
        'DRAFT'::character varying,
        'NOT_VALIDATED'::character varying,
        'VALIDATED'::character varying,
        'INVALID'::character varying,
        'RUNNING'::character varying,
        'PAUSED'::character varying,
        'COMPLETED'::character varying,
        'ERRORED'::character varying
    ]::text[])
);

-- Migrate existing DRAFT rows to NOT_VALIDATED
UPDATE pipelines SET status = 'NOT_VALIDATED' WHERE status = 'DRAFT';

