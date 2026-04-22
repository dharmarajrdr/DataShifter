package com.datashifter.common.enums;

public enum TransformFunction {
    // Text
    TRIM,
    UPPER,
    LOWER,
    CONCAT,             // Append static suffix (legacy name)
    APPEND,             // Append static suffix: value + args
    PREPEND,            // Prepend static prefix: args + value
    CONCAT_COLUMNS,     // Concatenate multiple column values: "separator|col1,col2"
    SUBSTRING,          // Extract substring: "start,end"
    TO_STRING,          // Convert any value to string

    // Type conversion
    TO_NUMBER,          // Parse string to number
    TO_BOOLEAN,         // Parse string to boolean (true/false, 1/0, yes/no)
    TO_DATE,            // Parse string to date: "pattern"

    // Null handling
    DEFAULT_IF_NULL,    // Replace null with default value

    // JSON
    TO_JSON,            // Build JSON object: TO_JSON('fieldName')
    TO_JSON_ARRAY,      // Build JSON array: TO_JSON_ARRAY('wrapperKey')

    // System values (no source column needed)
    CURRENT_TIMESTAMP,  // Returns current system time
    CURRENT_DATE,       // Returns current date (no time component)
    STATIC_VALUE,       // Returns a fixed constant value for every row
    UUID,               // Generates a random UUID v4
    ROW_NUMBER          // Sequential counter per pipeline execution
}