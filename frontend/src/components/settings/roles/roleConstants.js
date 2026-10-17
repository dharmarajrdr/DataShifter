export const PERMISSION_GROUPS = [
  {
    label: 'Pipelines', permissions: [
      { key: 'pipeline:create', label: 'Create pipelines' },
      { key: 'pipeline:view', label: 'View pipelines' },
      { key: 'pipeline:column-mapping', label: 'Column mapping' },
      { key: 'pipeline:delete', label: 'Delete pipelines' },
      { key: 'pipeline:run', label: 'Run pipelines' },
      { key: 'pipeline:pause', label: 'Pause pipelines' },
      { key: 'pipeline:stop', label: 'Stop pipelines' },
      { key: 'pipeline:settings', label: 'Pipeline settings' },
    ],
  },
  {
    label: 'Workflows', permissions: [
      { key: 'workflow:create', label: 'Create workflows' },
      { key: 'workflow:view', label: 'View workflows' },
      { key: 'workflow:edit', label: 'Edit workflows' },
      { key: 'workflow:delete', label: 'Delete workflows' },
      { key: 'workflow:run', label: 'Run workflows' },
      { key: 'workflow:pause', label: 'Pause workflows' },
      { key: 'workflow:stop', label: 'Stop workflows' },
    ],
  },
  {
    label: 'Namespaces', permissions: [
      { key: 'namespace:create', label: 'Create namespaces' },
      { key: 'namespace:edit', label: 'Edit namespaces' },
      { key: 'namespace:delete', label: 'Delete namespaces' },
    ],
  },
  {
    label: 'Connections', permissions: [
      { key: 'connection:view', label: 'View connections' },
      { key: 'connection:create', label: 'Create connections' },
      { key: 'connection:edit', label: 'Edit connections' },
      { key: 'connection:delete', label: 'Delete connections' },
      { key: 'connection:test', label: 'Test connections' },
      { key: 'connection:browse_schema', label: 'Browse schema' },
    ],
  },
  {
    label: 'Monitoring', permissions: [
      { key: 'monitor:view', label: 'View monitor' },
      { key: 'monitor:view_errors', label: 'View error logs' },
    ],
  },
  {
    label: 'Adapters', permissions: [
      { key: 'adapter:create', label: 'Install adapters' },
      { key: 'adapter:view', label: 'View adapters' },
      { key: 'adapter:delete', label: 'Delete adapters' },
      { key: 'adapter:purchase', label: 'Purchase adapters' },
    ],
  },
  {
    label: 'User-defined functions', permissions: [
      { key: 'udf:create', label: 'Upload UDFs' },
      { key: 'udf:view', label: 'View UDFs' },
      { key: 'udf:delete', label: 'Delete UDFs' },
    ],
  },
  {
    label: 'Settings', permissions: [
      { key: 'org:manage_members', label: 'Manage members' },
      { key: 'org:manage_roles', label: 'Manage roles' },
      { key: 'org:manage_invites', label: 'Manage invitations' },
      { key: 'org:view_audit', label: 'View audit log' },
    ],
  },
];
