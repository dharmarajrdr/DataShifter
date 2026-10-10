-- Migration V10: Add CREATED to connections status check constraint
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_status_check;

ALTER TABLE connections ADD CONSTRAINT connections_status_check CHECK (
    status::text = ANY (ARRAY[
        'CREATED'::character varying,
        'CONNECTED'::character varying,
        'FAILED'::character varying,
        'TESTING'::character varying
    ]::text[])
);

