export const EVENT_CATALOG = [
  {
    resourceType: 'PIPELINE', resourceName: 'Pipeline',
    events: [
      { action: 'COMPLETED', label: 'on pipeline completed', key: 'pipeline.completed' },
      { action: 'FAILED', label: 'on pipeline failed', key: 'pipeline.failed' },
      { action: 'STARTED', label: 'on pipeline started', key: 'pipeline.started' },
      { action: 'PAUSED', label: 'on pipeline paused', key: 'pipeline.paused' },
    ],
  },
  {
    resourceType: 'WORKFLOW', resourceName: 'Workflow',
    events: [
      { action: 'COMPLETED', label: 'on workflow completed', key: 'workflow.completed' },
      { action: 'FAILED', label: 'on workflow failed', key: 'workflow.failed' },
      { action: 'STARTED', label: 'on workflow started', key: 'workflow.started' },
    ],
  },
  {
    resourceType: 'UDF', resourceName: 'User-Defined Functions (UDF)',
    events: [
      { action: 'CREATED', label: 'on udf uploaded', key: 'udf.created' },
      { action: 'EDITED', label: 'on udf updated', key: 'udf.edited' },
      { action: 'REMOVED', label: 'on udf removed', key: 'udf.removed' },
    ],
  },
  {
    resourceType: 'CONNECTION', resourceName: 'Database Connection',
    events: [
      { action: 'CREATED', label: 'on connection created', key: 'connection.created' },
      { action: 'FAILED', label: 'on connection test failed', key: 'connection.failed' },
      { action: 'EDITED', label: 'on connection edited', key: 'connection.edited' },
    ],
  },
  {
    resourceType: 'SETUP', resourceName: 'Organization Setup & Config',
    events: [
      { action: 'UPDATED', label: 'on setup updates', key: 'setup.updated' },
      { action: 'ALERT', label: 'on threshold exceeded', key: 'setup.threshold' },
    ],
  },
  {
    resourceType: 'BEETEL', resourceName: 'Beetel AI Agent',
    events: [
      { action: 'COMPLETED', label: 'on beetel plan completed', key: 'beetel.completed' },
      { action: 'FAILED', label: 'on beetel action failed', key: 'beetel.failed' },
    ],
  },
];

export const PRIORITIES = [
  { value: 'INFO', label: 'Info (Standard Notification)' },
  { value: 'WARNING', label: 'Warning (Degradation Alert)' },
  { value: 'CRITICAL', label: 'Critical (Immediate Escalation)' },
];
