/**
 * Transform function metadata and categorized lists (<= 100 lines).
 */
export const COLOR_KEYS = ['purple', 'teal', 'coral', 'pink', 'blue'];

export const FN_META = {
  // Text
  TRIM: { desc: 'Remove leading/trailing whitespace', needsArgs: false, category: 'Text', inputTypes: ['STRING'], outputType: 'STRING' },
  UPPER: { desc: 'Convert to UPPERCASE', needsArgs: false, category: 'Text', inputTypes: ['STRING'], outputType: 'STRING' },
  LOWER: { desc: 'Convert to lowercase', needsArgs: false, category: 'Text', inputTypes: ['STRING'], outputType: 'STRING' },
  APPEND: { desc: 'Append suffix to value', needsArgs: true, argHint: "'_suffix'", category: 'Text', inputTypes: ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'], outputType: 'STRING' },
  PREPEND: { desc: 'Prepend prefix to value', needsArgs: true, argHint: "'PREFIX_'", category: 'Text', inputTypes: ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'], outputType: 'STRING' },
  CONCAT: { desc: 'Append suffix (alias for APPEND)', needsArgs: true, argHint: "'_suffix'", category: 'Text', inputTypes: ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'], outputType: 'STRING' },
  CONCAT_COLUMNS: { desc: 'Concat multiple columns', needsArgs: 'split', argHint: ['Separator', 'Column names (comma-sep)'], category: 'Text', inputTypes: ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'], outputType: 'STRING' },
  SUBSTRING: { desc: 'Extract substring by index', needsArgs: 'split', argHint: ['Start index (required)', 'End index (required)'], category: 'Text', inputTypes: ['STRING'], outputType: 'STRING' },
  TO_STRING: { desc: 'Convert to string', needsArgs: false, category: 'Type', inputTypes: ['ANY'], outputType: 'STRING' },

  // Math / Numeric
  ROUND: { desc: 'Round number to decimals (default 0)', needsArgs: 'optional', argHint: 'decimals (e.g., 2, 0)', category: 'Math', inputTypes: ['NUMBER'], outputType: 'NUMBER' },
  CEIL: { desc: 'Smallest integer >= value', needsArgs: false, category: 'Math', inputTypes: ['NUMBER'], outputType: 'NUMBER' },
  FLOOR: { desc: 'Largest integer <= value', needsArgs: false, category: 'Math', inputTypes: ['NUMBER'], outputType: 'NUMBER' },
  ABS: { desc: 'Absolute value', needsArgs: false, category: 'Math', inputTypes: ['NUMBER'], outputType: 'NUMBER' },
  TRUNC: { desc: 'Truncate towards zero to decimals (default 0)', needsArgs: 'optional', argHint: 'decimals (e.g., 2, 0)', category: 'Math', inputTypes: ['NUMBER'], outputType: 'NUMBER' },
  TO_NUMBER: { desc: 'Convert string, boolean, or date to number', needsArgs: false, category: 'Type', inputTypes: ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'], outputType: 'NUMBER' },

  // Date
  TO_DATE: { desc: 'Convert string or epoch number to date/timestamp', needsArgs: 'optional', argHint: "yyyy-MM-dd (optional for epoch number)", category: 'Type', inputTypes: ['STRING', 'NUMBER', 'DATE'], outputType: 'DATE' },

  // Boolean
  TO_BOOLEAN: { desc: 'Parse to boolean (true/false, 1/0, yes/no)', needsArgs: false, category: 'Type', inputTypes: ['STRING', 'NUMBER', 'BOOLEAN'], outputType: 'BOOLEAN' },

  // Null
  DEFAULT_IF_NULL: { desc: 'Replace null with default (only when source is null)', needsArgs: true, argHint: "default value", category: 'Null', inputTypes: ['ANY'], outputType: 'SAME' },

  // JSON
  TO_JSON: { desc: 'Build JSON object field', needsArgs: true, argHint: 'field name', category: 'JSON', inputTypes: ['ANY'], outputType: 'JSON' },
  TO_JSON_ARRAY: { desc: 'Build JSON array', needsArgs: 'optional', argHint: 'wrapper key (optional)', category: 'JSON', inputTypes: ['ANY'], outputType: 'JSON' },

  // System values (no source column needed)
  CURRENT_TIMESTAMP: { desc: 'Current system timestamp', needsArgs: false, category: 'System', isSystemValue: true, inputTypes: ['ANY'], outputType: 'DATE' },
  CURRENT_DATE: { desc: 'Current date (no time)', needsArgs: false, category: 'System', isSystemValue: true, inputTypes: ['ANY'], outputType: 'DATE' },
  STATIC_VALUE: { desc: 'Fixed constant for every row', needsArgs: true, argHint: 'value (e.g., STANDARD)', category: 'System', isSystemValue: true, inputTypes: ['ANY'], outputType: 'STRING' },
  UUID: { desc: 'Generate UUID v4', needsArgs: false, category: 'System', isSystemValue: true, inputTypes: ['ANY'], outputType: 'STRING' },
  ROW_NUMBER: { desc: 'Sequential counter (1, 2, 3...)', needsArgs: false, category: 'System', isSystemValue: true, inputTypes: ['ANY'], outputType: 'NUMBER' },

  // Java UDF
  UDF: { desc: 'Custom Java row UDF', needsArgs: 'udf', category: 'Custom', inputTypes: ['ANY'], outputType: 'ANY' },
};

export const ALL_FUNCTIONS = [
  'TRIM', 'UPPER', 'LOWER', 'APPEND', 'PREPEND', 'CONCAT', 'CONCAT_COLUMNS', 'SUBSTRING',
  'ROUND', 'CEIL', 'FLOOR', 'ABS', 'TRUNC',
  'TO_STRING', 'TO_NUMBER', 'TO_BOOLEAN', 'TO_DATE',
  'DEFAULT_IF_NULL', 'TO_JSON', 'TO_JSON_ARRAY',
];
