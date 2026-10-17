export const DB_TYPES = [
  { value: 'ORACLE', label: 'Oracle', defaultPort: 1521 },
  { value: 'POSTGRESQL', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'SPANNER', label: 'Google Cloud Spanner', defaultPort: null },
];

export const getFieldConfig = (dbType) => {
  switch (dbType) {
    case 'ORACLE':
      return {
        hostLabel: 'Host',
        hostPlaceholder: 'oracle-prod.company.com',
        showPort: true,
        databaseLabel: 'Database / SID',
        databasePlaceholder: 'ORCL',
        showSchema: true,
        schemaLabel: 'Schema',
        schemaPlaceholder: 'PROD_SCHEMA',
        showCredentials: true,
        showServiceAccountKey: false,
      };
    case 'POSTGRESQL':
      return {
        hostLabel: 'Host',
        hostPlaceholder: 'pg-prod.company.com',
        showPort: true,
        databaseLabel: 'Database name',
        databasePlaceholder: 'mydb',
        showSchema: true,
        schemaLabel: 'Schema',
        schemaPlaceholder: 'public',
        schemaDefault: 'public',
        showCredentials: true,
        showServiceAccountKey: false,
      };
    case 'SPANNER':
      return {
        hostLabel: 'Instance path',
        hostPlaceholder: 'projects/my-project/instances/my-instance',
        hostHint: 'Format: projects/{project}/instances/{instance}',
        showPort: false,
        databaseLabel: 'Database name',
        databasePlaceholder: 'orders-db',
        showSchema: false,
        showCredentials: false,
        showServiceAccountKey: true,
      };
    default:
      return {
        hostLabel: 'Host',
        hostPlaceholder: 'hostname',
        showPort: true,
        databaseLabel: 'Database',
        databasePlaceholder: '',
        showSchema: true,
        schemaLabel: 'Schema',
        schemaPlaceholder: '',
        showCredentials: true,
        showServiceAccountKey: false,
      };
  }
};

export const INITIAL_FORM = {
  name: '', dbType: 'ORACLE', host: '', port: 1521,
  databaseName: '', schemaName: '', username: '', password: '',
};
