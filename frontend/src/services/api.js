/* ============================================================
   API SERVICE
   
   Toggle: set USE_MOCK in apiClient.js
     true  → returns hardcoded mock data (no backend needed)
     false → calls real backend through Gateway (port 8080)
   
   Response format (both modes): { message, data, info, status }
   Pages consume via: api.someMethod().then(res => res.data)
   ============================================================ */

import { apiClient, USE_MOCK } from './apiClient';

/* ================================================================
   MOCK DATA — kept for offline development and demo mode
   ================================================================ */

const mockResponse = (data, message = 'Success') => 
  Promise.resolve({ message, data, info: null, status: 200 });

export const MOCK_NAMESPACES = [
  { id: 'ns-default', name: 'Default', description: 'Pipelines not assigned to a specific namespace', color: '#888780', pipelineCount: 2 },
  { id: 'ns-payments', name: 'Payments', description: 'Payment processing migration', color: '#534AB7', pipelineCount: 2 },
  { id: 'ns-analytics', name: 'Analytics', description: 'Analytics data pipelines', color: '#1D9E75', pipelineCount: 1 },
];

export const MOCK_PIPELINES = [
  { id: 'p-001', name: 'Orders migration', namespaceId: 'ns-payments', namespaceName: 'Payments', source: 'Oracle prod', target: 'Spanner US', tableCount: 8, status: 'RUNNING', progress: 72, rowsProcessed: 72450000, totalRows: 100000000, createdAt: '2026-04-10T08:00:00Z', ownerName: 'Arun Kumar', ownerInitials: 'AK', ownerColor: '#534AB7' },
  { id: 'p-002', name: 'User profiles sync', namespaceId: 'ns-default', namespaceName: 'Default', source: 'Oracle staging', target: 'Spanner EU', tableCount: 3, status: 'ERRORED', progress: 45, rowsProcessed: 4500000, totalRows: 10000000, createdAt: '2026-04-12T14:30:00Z', ownerName: 'Priya Sharma', ownerInitials: 'PS', ownerColor: '#D4537E' },
  { id: 'p-003', name: 'Inventory transfer', namespaceId: 'ns-payments', namespaceName: 'Payments', source: 'Oracle prod', target: 'Spanner US', tableCount: 5, status: 'PAUSED', progress: 60, rowsProcessed: 30000000, totalRows: 50000000, createdAt: '2026-04-13T09:15:00Z', ownerName: 'Arun Kumar', ownerInitials: 'AK', ownerColor: '#534AB7' },
  { id: 'p-004', name: 'Analytics backfill', namespaceId: 'ns-analytics', namespaceName: 'Analytics', source: 'Oracle DR', target: 'Spanner US', tableCount: 12, status: 'COMPLETED', progress: 100, rowsProcessed: 85000000, totalRows: 85000000, createdAt: '2026-04-08T06:00:00Z', ownerName: 'Meera Nair', ownerInitials: 'MN', ownerColor: '#1D9E75' },
  { id: 'p-005', name: 'Customer 360 load', namespaceId: 'ns-default', namespaceName: 'Default', source: 'Oracle prod', target: 'Spanner US', tableCount: 6, status: 'DRAFT', progress: 0, rowsProcessed: 0, totalRows: 45000000, createdAt: '2026-04-15T11:00:00Z', ownerName: 'Priya Sharma', ownerInitials: 'PS', ownerColor: '#D4537E' },
];

export const MOCK_CONNECTIONS = [
  { id: 'c-001', name: 'Oracle production', type: 'Oracle 19c', dbType: 'ORACLE', host: 'oracle-prod.company.com:1521', schema: 'PROD_SCHEMA', tableCount: 142, status: 'CONNECTED', lastTested: '2026-04-16T08:00:00Z', error: null },
  { id: 'c-002', name: 'Spanner US-East', type: 'Cloud Spanner', dbType: 'SPANNER', host: 'projects/myproj/instances/us-east1', schema: 'orders-db', tableCount: 89, status: 'CONNECTED', lastTested: '2026-04-16T08:00:00Z', error: null },
  { id: 'c-003', name: 'Oracle staging', type: 'Oracle 19c', dbType: 'ORACLE', host: 'oracle-stg.company.com:1521', schema: 'STG_SCHEMA', tableCount: 0, status: 'FAILED', lastTested: '2026-04-16T06:00:00Z', error: 'Connection refused: timeout after 30s.' },
];

export const MOCK_MONITOR = {
  pipelineId: 'p-001', pipelineName: 'Orders migration', status: 'RUNNING',
  rowsProcessed: 72450000, rowsPerSec: 12400, errorsSkipped: 23, eta: '~37 min', overallProgress: 72.4,
  tables: [
    { name: 'customers', progress: 100, status: 'COMPLETED' }, { name: 'products', progress: 100, status: 'COMPLETED' },
    { name: 'categories', progress: 100, status: 'COMPLETED' }, { name: 'orders', progress: 68, status: 'RUNNING' },
    { name: 'order_items', progress: 0, status: 'PENDING' }, { name: 'payments', progress: 0, status: 'PENDING' },
    { name: 'shipping', progress: 0, status: 'PENDING' }, { name: 'audit_log', progress: 0, status: 'PENDING' },
  ],
  inflightRecords: [
    { order_id: 1048832, customer_id: 290451, order_date: '2024-03-15', total_amount: '2499.99', order_status: 'SHIPPED', notes: 'Express delivery' },
    { order_id: 1048833, customer_id: 118724, order_date: '2024-03-15', total_amount: '89.50', order_status: 'PENDING', notes: 'Gift wrap req' },
    { order_id: 1048834, customer_id: 445102, order_date: '2024-03-15', total_amount: '15750.00', order_status: 'CONFIRMED', notes: 'Bulk order' },
    { order_id: 1048835, customer_id: 672388, order_date: '2024-03-16', total_amount: '340.25', order_status: 'SHIPPED', notes: 'Standard' },
    { order_id: 1048836, customer_id: 903217, order_date: '2024-03-16', total_amount: '4200.00', order_status: 'PENDING', notes: 'Priority ship' },
    { order_id: 1048837, customer_id: 134299, order_date: '2024-03-16', total_amount: '1120.00', order_status: 'CONFIRMED', notes: 'Return customer' },
  ],
};

export const MOCK_MAPPING = {
  pipelineId: 'p-001', pipelineName: 'Orders migration', sourceTable: 'ORA_ORDERS', targetTable: 'spn_orders', writeMode: 'UPSERT',
  sourceColumns: [
    { name: 'ORDER_ID', type: 'NUMBER', mapped: true }, { name: 'CUST_ID', type: 'NUMBER', mapped: true },
    { name: 'ORDER_DATE', type: 'VARCHAR2', mapped: true }, { name: 'AMOUNT', type: 'NUMBER', mapped: true },
    { name: 'STATUS', type: 'VARCHAR2', mapped: true }, { name: 'NOTES', type: 'CLOB', mapped: true },
    { name: 'INTERNAL_FLAG', type: 'NUMBER', mapped: false },
  ],
  targetColumns: [
    { name: 'order_id', type: 'INT64', mapped: true }, { name: 'customer_id', type: 'INT64', mapped: true },
    { name: 'order_date', type: 'DATE', mapped: true }, { name: 'total_amount', type: 'STRING', mapped: true },
    { name: 'order_status', type: 'STRING', mapped: true }, { name: 'notes', type: 'STRING', mapped: true },
    { name: 'migrated_at', type: 'TIMESTAMP', mapped: false },
  ],
  mappings: [
    { source: 'ORDER_ID', target: 'order_id', color: 'purple', transforms: [] },
    { source: 'CUST_ID', target: 'customer_id', color: 'purple', transforms: [] },
    { source: 'ORDER_DATE', target: 'order_date', color: 'purple', transforms: [{ fn: 'TO_DATE', args: "'yyyy-MM-dd'" }] },
    { source: 'AMOUNT', target: 'total_amount', color: 'teal', transforms: [{ fn: 'TO_STRING', args: '' }] },
    { source: 'STATUS', target: 'order_status', color: 'teal', transforms: [] },
    { source: 'NOTES', target: 'notes', color: 'coral', transforms: [{ fn: 'TRIM', args: '' }, { fn: 'TO_STRING', args: '' }] },
  ],
};

export const MOCK_TRANSFORM = {
  sourceColumn: 'ORDER_DATE', sourceType: 'VARCHAR2', targetColumn: 'order_date', targetType: 'DATE',
  steps: [
    { id: 's1', fn: 'TRIM', args: '', description: 'Remove whitespace' },
    { id: 's2', fn: 'TO_DATE', args: "'yyyy-MM-dd'", description: 'Parse date string' },
  ],
  preview: [
    { source: '" 2024-03-15 "', afterStep1: '"2024-03-15"', output: '2024-03-15', status: 'OK' },
    { source: '"2024-01-01"', afterStep1: '"2024-01-01"', output: '2024-01-01', status: 'OK' },
    { source: 'null', afterStep1: 'null', output: 'ERROR', status: 'ERROR' },
  ],
};

export const AVAILABLE_FUNCTIONS = [
  'TRIM', 'UPPER', 'LOWER', 'APPEND', 'PREPEND', 'CONCAT', 'CONCAT_COLUMNS',
  'SUBSTRING', 'TO_STRING', 'TO_DATE', 'TO_NUMBER', 'DEFAULT_IF_NULL',
  'TO_JSON', 'TO_JSON_ARRAY', 'CURRENT_TIMESTAMP',
];

export const MOCK_ERRORS = {
  pipelineId: 'p-001', pipelineName: 'Orders migration',
  summary: { total: 147, skipped: 123, stopped: 24, errorRate: '0.0002%' },
  errorTypes: [
    { type: 'TYPE_CAST_FAILED', count: 89, color: 'error' }, { type: 'NULL_CONSTRAINT', count: 34, color: 'warning' },
    { type: 'PK_DUPLICATE', count: 18, color: 'purple' }, { type: 'WRITE_TIMEOUT', count: 6, color: 'default' },
  ],
  errors: [
    { id: 'e-001', type: 'TYPE_CAST_FAILED', sourceTable: 'ORA_ORDERS', targetTable: 'spn_orders', chunk: 4521, row: 45210087, message: 'Cannot cast "INVALID_DATE" to DATE for column order_date. Input: "2024-13-45"', sourceData: '{ ORDER_ID: 45210087, CUST_ID: 882134, ORDER_DATE: "2024-13-45", AMOUNT: 299.99, STATUS: "PENDING" }' },
    { id: 'e-002', type: 'NULL_CONSTRAINT', sourceTable: 'ORA_CUSTOMERS', targetTable: 'spn_customers', chunk: 1203, row: 12030044, message: 'Column customer_name cannot be NULL in target table spn_customers', sourceData: '{ CUST_ID: 12030044, CUST_NAME: null, EMAIL: "test@test.com", PHONE: "+1-555-0199" }' },
    { id: 'e-003', type: 'PK_DUPLICATE', sourceTable: 'ORA_PRODUCTS', targetTable: 'spn_products', chunk: 782, row: 7820156, message: 'Duplicate primary key product_id=7820156. Write mode: INSERT_ONLY', sourceData: '{ PROD_ID: 7820156, PROD_NAME: "Widget Pro", CATEGORY: "Electronics", PRICE: 49.99 }' },
  ],
};

export const MOCK_SETTINGS = {
  pipelineId: 'p-001', name: 'Orders migration', description: 'Migrate order data from Oracle prod to Spanner US',
  chunkSize: 10000, defaultWriteMode: 'UPSERT', ignoreExceptions: false, maxErrorThreshold: 1000, logSourceRow: true,
  tableOverrides: [
    { table: 'spn_customers', writeMode: 'UPSERT', isOverride: false }, { table: 'spn_orders', writeMode: 'INSERT_ONLY', isOverride: true },
    { table: 'spn_order_items', writeMode: 'UPSERT', isOverride: false }, { table: 'spn_products', writeMode: 'UPDATE_ONLY', isOverride: true },
  ],
};

export const MOCK_AVAILABLE_TABLES = [
  'ORA_CUSTOMERS', 'ORA_PRODUCTS', 'ORA_CATEGORIES', 'ORA_ORDERS',
  'ORA_ORDER_ITEMS', 'ORA_PAYMENTS', 'ORA_SHIPPING', 'ORA_AUDIT_LOG',
  'ORA_RETURNS', 'ORA_SUPPLIERS', 'ORA_WAREHOUSES',
];

/* ================================================================
   API FUNCTIONS — real REST calls with mock fallback
   
   When USE_MOCK=false: calls Gateway → backend services
   When USE_MOCK=true:  returns hardcoded mock data
   
   Same function signatures, same response shape either way.
   ================================================================ */

/* ----- PIPELINES (pipeline-service via gateway:8080) ----- */

export const pipelineApi = {

  getAll: () => USE_MOCK
    ? mockResponse(MOCK_PIPELINES)
    : apiClient.get('/pipelines'),

  getById: (id) => USE_MOCK
    ? mockResponse(MOCK_PIPELINES.find(p => p.id === id))
    : apiClient.get(`/pipelines/${id}`),

  create: (payload) => USE_MOCK
    ? mockResponse({ ...payload, id: 'p-new-' + Date.now(), status: 'DRAFT', createdAt: new Date().toISOString() })
    : apiClient.post('/pipelines', payload),

  update: (id, payload) => USE_MOCK
    ? mockResponse({ ...MOCK_PIPELINES.find(p => p.id === id), ...payload })
    : apiClient.put(`/pipelines/${id}`, payload),

  delete: (id) => USE_MOCK
    ? mockResponse(null)
    : apiClient.delete(`/pipelines/${id}`),

  performAction: (id, action) => USE_MOCK
    ? mockResponse({ ...MOCK_PIPELINES.find(p => p.id === id), status: action === 'START' ? 'RUNNING' : action === 'PAUSE' ? 'PAUSED' : 'ERRORED' })
    : apiClient.post(`/pipelines/${id}/actions`, { action }),
};

/* ----- CONNECTIONS (connector-service via gateway:8080) ----- */

export const connectionApi = {

  getAll: () => USE_MOCK
    ? mockResponse(MOCK_CONNECTIONS)
    : apiClient.get('/connections'),

  getById: (id) => USE_MOCK
    ? mockResponse(MOCK_CONNECTIONS.find(c => c.id === id))
    : apiClient.get(`/connections/${id}`),

  create: (payload) => USE_MOCK
    ? mockResponse({ ...payload, id: 'c-new-' + Date.now(), status: 'TESTING' })
    : apiClient.post('/connections', payload),

  update: (id, payload) => USE_MOCK
    ? mockResponse({ ...MOCK_CONNECTIONS.find(c => c.id === id), ...payload })
    : apiClient.put(`/connections/${id}`, payload),

  delete: (id) => USE_MOCK
    ? mockResponse(null)
    : apiClient.delete(`/connections/${id}`),

  test: (id) => USE_MOCK
    ? mockResponse({ success: true, message: 'Connected successfully', tableCount: 142, latencyMs: 45 })
    : apiClient.post(`/connections/${id}/test`),

  listTables: (id) => USE_MOCK
    ? mockResponse(MOCK_AVAILABLE_TABLES)
    : apiClient.get(`/connections/${id}/tables`),

  getTableMetadata: (id, tableName) => USE_MOCK
    ? mockResponse({ tableName, columns: [], foreignKeys: [], estimatedRowCount: 0 })
    : apiClient.get(`/connections/${id}/tables/${tableName}`),

  getForeignKeys: (id, tableName) => USE_MOCK
    ? mockResponse([])
    : apiClient.get(`/connections/${id}/tables/${tableName}/foreign-keys`),
};

/* ----- MONITORING (monitor-service via gateway:8080) ----- */

export const monitorApi = {

  getByPipelineId: (id) => USE_MOCK
    ? mockResponse(MOCK_MONITOR)
    : apiClient.get(`/pipelines/${id}/monitor`),

  getErrors: (id, page = 0, size = 20) => USE_MOCK
    ? mockResponse(MOCK_ERRORS)
    : apiClient.get(`/pipelines/${id}/errors?page=${page}&size=${size}`),

  getExecutionHistory: (id) => USE_MOCK
    ? mockResponse([])
    : apiClient.get(`/pipelines/${id}/executions`),
};

/* ----- MAPPINGS (pipeline-service via gateway:8080) ----- */

export const mappingApi = {

  getByPipelineId: (id) => USE_MOCK
    ? mockResponse(MOCK_MAPPING)
    : apiClient.get(`/pipelines/${id}/mappings`),

  save: (id, payload) => USE_MOCK
    ? mockResponse(payload)
    : apiClient.put(`/pipelines/${id}/mappings`, payload),
};

/* ----- ERRORS (monitor-service via gateway:8080) ----- */

export const errorApi = {

  getByPipelineId: (id, page = 0, size = 20) => USE_MOCK
    ? mockResponse(MOCK_ERRORS)
    : apiClient.get(`/pipelines/${id}/errors?page=${page}&size=${size}`),

  clear: (id) => USE_MOCK
    ? mockResponse(null)
    : apiClient.delete(`/pipelines/${id}/errors`),
};

/* ----- SETTINGS (pipeline-service via gateway:8080) ----- */

export const settingsApi = {

  getByPipelineId: (id) => USE_MOCK
    ? mockResponse(MOCK_SETTINGS)
    : apiClient.get(`/pipelines/${id}/settings`),

  save: (id, payload) => USE_MOCK
    ? mockResponse(payload)
    : apiClient.put(`/pipelines/${id}/settings`, payload),

  addTablePair: (id, sourceTable, targetTable) => USE_MOCK
    ? mockResponse({})
    : apiClient.post(`/pipelines/${id}/settings/tables`, { sourceTable, targetTable }),

  removeTablePair: (id, pipelineTableId) => USE_MOCK
    ? mockResponse(null)
    : apiClient.delete(`/pipelines/${id}/settings/tables/${pipelineTableId}`),
};

/* ----- NAMESPACES (pipeline-service via gateway:8080) ----- */

export const namespaceApi = {

  getAll: () => USE_MOCK
    ? mockResponse(MOCK_NAMESPACES)
    : apiClient.get('/namespaces'),

  create: (payload) => USE_MOCK
    ? mockResponse({ ...payload, id: 'ns-' + Date.now(), pipelineCount: 0 })
    : apiClient.post('/namespaces', payload),

  update: (id, payload) => USE_MOCK
    ? mockResponse({ ...MOCK_NAMESPACES.find(n => n.id === id), ...payload })
    : apiClient.put(`/namespaces/${id}`, payload),

  delete: (id) => USE_MOCK
    ? mockResponse(null)
    : apiClient.delete(`/namespaces/${id}`),

  movePipeline: (pipelineId, namespaceId) => USE_MOCK
    ? mockResponse(null)
    : apiClient.post(`/namespaces/pipelines/${pipelineId}/move`, { namespaceId }),
};

export { authApi } from './authApi';