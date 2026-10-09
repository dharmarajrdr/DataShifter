-- Migration V6: Allow 'UDF' in transformations check constraint
ALTER TABLE transformations DROP CONSTRAINT IF EXISTS transformations_function_name_check;

ALTER TABLE transformations ADD CONSTRAINT transformations_function_name_check CHECK (
    function_name::text = ANY (ARRAY[
        'TRIM', 'UPPER', 'LOWER', 'CONCAT', 'APPEND', 'PREPEND',
        'CONCAT_COLUMNS', 'SUBSTRING', 'TO_STRING', 'TO_NUMBER',
        'TO_BOOLEAN', 'TO_DATE', 'DEFAULT_IF_NULL', 'TO_JSON',
        'TO_JSON_ARRAY', 'CURRENT_TIMESTAMP', 'CURRENT_DATE',
        'STATIC_VALUE', 'UUID', 'ROW_NUMBER', 'UDF'
    ]::text[])
);
