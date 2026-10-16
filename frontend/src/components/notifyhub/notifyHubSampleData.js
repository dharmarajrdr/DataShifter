export const SAMPLE_CHANNELS = [
  { id: 'ch-1', name: '#data-pipeline-alerts', channelType: 'SLACK', enabled: true, dispatchedCount: 142, configJson: '{"scope":"On Error / Halt"}' },
  { id: 'ch-2', name: 'Tier-1 On-Call Rotation', channelType: 'WEBHOOK', enabled: true, dispatchedCount: 18, configJson: '{"scope":"Critical Latency Breaches"}' },
  { id: 'ch-3', name: 'Datadog Event Ingestion', channelType: 'WEBHOOK', enabled: true, dispatchedCount: 1840, configJson: '{"scope":"HMAC-SHA256 Signed"}' },
  { id: 'ch-4', name: 'Daily Operations Digest', channelType: 'EMAIL', enabled: false, dispatchedCount: 54, configJson: '{"scope":"Ops Leads Team"}' },
];

export const SAMPLE_LISTENERS = [
  { id: 'ls-1', name: 'Pipeline Failure Escalation', resourceType: 'PIPELINE', eventKey: 'pipeline.failed', eventAction: 'FAILED', channelId: 'ch-1', templateId: 'tmpl-1', priority: 'CRITICAL', enabled: true, description: 'Triggers high-priority Slack notifications when any ingestion pipeline errors out.' },
  { id: 'ls-2', name: 'Latency SLA Breach Alert', resourceType: 'PIPELINE', eventKey: 'pipeline.sla_breach', eventAction: 'ALERT', channelId: 'ch-2', templateId: 'tmpl-1', priority: 'CRITICAL', enabled: true, description: 'Dispatches PagerDuty incident when replication latency breaches 60 seconds.' },
  { id: 'ls-3', name: 'Nightly Flow Completed', resourceType: 'WORKFLOW', eventKey: 'workflow.completed', eventAction: 'COMPLETED', channelId: 'ch-3', templateId: 'tmpl-3', priority: 'INFO', enabled: true, description: 'Emits webhook events to Datadog telemetry upon nightly reconciliation completion.' },
  { id: 'ls-4', name: 'Connector Health Degradation', resourceType: 'CONNECTION', eventKey: 'connection.failed', eventAction: 'FAILED', channelId: 'ch-1', templateId: 'tmpl-1', priority: 'CRITICAL', enabled: true, description: 'Alerts database administrators if PostgreSQL or MySQL heartbeat check fails.' },
  { id: 'ls-5', name: 'Daily Batch Start Notice', resourceType: 'PIPELINE', eventKey: 'pipeline.started', eventAction: 'STARTED', channelId: 'ch-4', templateId: 'tmpl-2', priority: 'INFO', enabled: false, description: 'Emails operations leadership team whenever scheduled batch ETL pipelines trigger.' },
  { id: 'ls-6', name: 'UDF Bytecode Compilation Alert', resourceType: 'UDF', eventKey: 'udf.edited', eventAction: 'EDITED', channelId: 'ch-3', templateId: 'tmpl-3', priority: 'WARNING', enabled: true, description: 'Tracks code revisions and audit logs when custom transform UDFs are updated.' },
];

export const SAMPLE_TEMPLATES = [
  { id: 'tmpl-1', name: 'Critical Incident Pager', format: 'MARKDOWN', subject: '[CRITICAL] {{pipelineName}} execution failed on {{cluster}}', body: '**Pipeline Execution Alert**\nPipeline: {{pipelineName}}\nStatus: FAILED\nError: {{errorMessage}}\nTime: {{timestamp}}' },
  { id: 'tmpl-2', name: 'Daily Digest Summary', format: 'HTML', subject: 'DataShifter Daily Execution Digest - {{date}}', body: '<h3>Daily Operations Report</h3><p>Active pipelines: {{activeCount}}</p><p>Total migrated: {{totalRows}}</p>' },
  { id: 'tmpl-3', name: 'Webhook Event Payload', format: 'JSON', subject: 'application/json webhook event notification', body: '{\n  "event": "{{eventKey}}",\n  "resource": "{{resourceId}}",\n  "status": "{{status}}",\n  "timestamp": "{{timestamp}}"\n}' },
];
