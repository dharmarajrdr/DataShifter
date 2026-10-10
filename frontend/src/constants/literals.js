/* ============================================================
   LITERALS — all user-facing strings for i18n readiness
   ============================================================ */

export const APP = {
  name: 'Datashifter',
  tagline: 'Data migration, simplified.',
};

export const NAV = {
  pipelines: 'Pipelines',
  connections: 'Connections',
  udfs: 'UDF library'
};

export const PIPELINE = {
  title: 'Pipelines',
  subtitle: 'Manage your data migration pipelines',
  newPipeline: '+ New pipeline',
  metrics: {
    total: 'Total',
    running: 'Running',
    errored: 'Errored',
    paused: 'Paused',
  },
  table: {
    name: 'Pipeline name',
    source: 'Source',
    target: 'Target',
    tables: 'Tables',
    status: 'Status',
    progress: 'Progress',
  },
  statuses: {
    DRAFT: 'Draft',
    NOT_VALIDATED: 'Not Validated',
    VALIDATED: 'Validated',
    INVALID: 'Invalid',
    RUNNING: 'Running',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
    ERRORED: 'Errored',
  },
};

export const CONNECTION = {
  title: 'Connections',
  subtitle: 'Manage source and target database connections',
  newConnection: '+ New connection',
  test: 'Test',
  edit: 'Edit',
  delete: 'Delete',
  retry: 'Retry',
  browseSchema: 'Browse schema',
  statuses: {
    CREATED: 'Created',
    CONNECTED: 'Connected',
    FAILED: 'Failed',
    TESTING: 'Testing...',
  },
};

export const MONITOR = {
  title: 'Live monitor',
  rowsProcessed: 'Rows processed',
  rowsPerSec: 'Rows/sec',
  errorsSkipped: 'Errors skipped',
  eta: 'ETA',
  overallProgress: 'Overall progress',
  tableProgress: 'Table progress',
  inflightRecords: 'In-flight records (latest 100)',
  refresh: 'Refresh',
  pause: 'Pause',
  resume: 'Resume',
  stop: 'Stop',
};

export const WIZARD = {
  steps: ['Basics', 'Connections', 'Tables', 'Mapping', 'Review'],
  back: 'Back',
  next: 'Next',
  create: 'Create pipeline',
  smartOrder: 'Smart order',
  available: 'Available tables',
  selected: 'Selected tables (execution order)',
  search: 'Search tables...',
};

export const MAPPING = {
  title: 'Column mapping',
  autoMap: 'Auto-map',
  saveMapping: 'Save mapping',
  addFilter: 'Add filter on source',
  writeMode: 'Write mode',
  activeTransformations: 'Active transformations',
};

export const TRANSFORM = {
  title: 'Transformation builder',
  functionChain: 'Function chain (applied top → bottom)',
  availableFunctions: 'Available functions',
  livePreview: 'Live preview (sample data)',
  addFunction: '+ Add function',
  apply: 'Apply transformation',
  cancel: 'Cancel',
};

export const ERRORS = {
  title: 'Error logs',
  totalErrors: 'Total errors',
  skipped: 'Skipped (ignored)',
  pipelineStopped: 'Pipeline stopped',
  errorRate: 'Error rate',
  errorsByType: 'Errors by type',
  exportCsv: 'Export CSV',
  searchPlaceholder: 'Search by PK, table, or error message...',
  sourceRowData: 'Source row data',
};

export const SETTINGS = {
  title: 'Pipeline settings',
  save: 'Save settings',
  general: {
    title: 'General',
    subtitle: 'Core pipeline configuration',
    name: 'Pipeline name',
    description: 'Description',
  },
  processing: {
    title: 'Processing',
    subtitle: 'Control how data is read and written',
    chunkSize: 'Chunk size (rows per batch)',
    chunkHint: 'Larger chunks = faster, but more memory. Recommended: 5,000–20,000',
    defaultWriteMode: 'Default write mode',
  },
  errorHandling: {
    title: 'Error handling',
    subtitle: 'Define behavior when errors occur during migration',
    ignoreExceptions: 'Ignore exceptions',
    ignoreExceptionsDesc: 'Skip failed rows and continue. Errors are logged.',
    maxThreshold: 'Max error threshold',
    maxThresholdDesc: 'Stop pipeline after N errors even if ignoring exceptions',
    logSourceRow: 'Log source row on error',
    logSourceRowDesc: 'Store the full source row data for every failed record',
  },
  perTable: {
    title: 'Table write modes',
    subtitle: 'Configure the write mode for each target table',
    targetTable: 'Target table',
    writeMode: 'Write mode',
    override: 'Write mode',
  },
  writeModes: {
    INSERT_ONLY: { label: 'Insert only', desc: 'Fail if PK exists' },
    INSERT_IGNORE: { label: 'Insert only', desc: 'Ignore if PK exists' },
    UPSERT: { label: 'Upsert', desc: 'Insert or update' },
    UPDATE_ONLY: { label: 'Update only', desc: 'Skip if not found' },
  },
};
