export const DB_TYPES = [
  { value: 'ORACLE', label: 'Oracle', defaultPort: 1521 },
  { value: 'POSTGRESQL', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'S3', label: 'AWS S3', defaultPort: null },
  { value: 'SPANNER', label: 'Google Cloud Spanner', defaultPort: null },
];

export const getFieldConfig = (dbType) => {
  switch (dbType) {
    case 'S3':
      return {
        hostLabel: 'AWS Region',
        hostPlaceholder: 'us-east-1',
        showPort: false,
        databaseLabel: 'Default S3 Bucket (Optional)',
        databasePlaceholder: 'my-lake-bucket',
        showSchema: false,
        showCredentials: true,
        usernameLabel: 'AWS Access Key ID',
        usernamePlaceholder: 'AKIAIOSFODNN7EXAMPLE',
        passwordLabel: 'AWS Secret Access Key',
        passwordPlaceholder: 'Enter AWS Secret Access Key',
        showServiceAccountKey: false,
      };
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
