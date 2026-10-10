-- Migration V8: Allow 'INSERT_IGNORE' in pipelines and target_table_mappings check constraints
ALTER TABLE pipelines
DROP CONSTRAINT IF EXISTS pipelines_default_write_mode_check;

ALTER TABLE pipelines ADD CONSTRAINT pipelines_default_write_mode_check CHECK (
    default_write_mode::text = ANY (ARRAY[
        'INSERT_ONLY'::character varying,
        'INSERT_IGNORE'::character varying,
        'UPSERT'::character varying,
        'UPDATE_ONLY'::character varying
    ]::text[])
);

ALTER TABLE target_table_mappings
DROP CONSTRAINT IF EXISTS target_table_mappings_write_mode_check;

ALTER TABLE target_table_mappings ADD CONSTRAINT target_table_mappings_write_mode_check CHECK (
    write_mode::text = ANY (ARRAY[
        'INSERT_ONLY'::character varying,
        'INSERT_IGNORE'::character varying,
        'UPSERT'::character varying,
        'UPDATE_ONLY'::character varying
    ]::text[])
);

