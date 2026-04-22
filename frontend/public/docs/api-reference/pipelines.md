# Pipelines API

CRUD and execution endpoints for migration pipelines.

## Endpoints

### GET /api/v1/pipelines

List all pipelines in the current organization.

Response returns an array of pipeline summaries with status, progress, and table count.

### POST /api/v1/pipelines

Create a new pipeline.

```json
{
  "name": "Customer Migration",
  "description": "Migrate customer data from Oracle to PostgreSQL",
  "sourceConnectionId": "conn-uuid",
  "targetConnectionId": "conn-uuid",
  "tables": [
    {
      "sourceTable": "src_customers",
      "executionOrder": 0,
      "targetMappings": [
        { "targetTable": "tgt_customers" }
      ]
    }
  ]
}
```

### GET /api/v1/pipelines/:id

Get full pipeline details including table mappings, column mappings, and transformations.

### PUT /api/v1/pipelines/:id/settings

Update pipeline configuration.

```json
{
  "name": "Updated Name",
  "chunkSize": 5000,
  "defaultWriteMode": "UPSERT",
  "ignoreExceptions": true,
  "maxErrorThreshold": 5000,
  "sourcePoolSize": 5,
  "targetPoolSize": 10,
  "previewInflightRecords": false
}
```

### POST /api/v1/pipelines/:id/action

Execute pipeline actions.

```json
{ "action": "START" }
```

| Action | Description |
|--------|-------------|
| START | Begin migration from the beginning |
| RESUME | Continue from last checkpoint |
| PAUSE | Temporarily stop |
| STOP | Hard stop, resets progress |

### DELETE /api/v1/pipelines/:id

Delete a pipeline and all its mappings. Cannot delete a running pipeline.

## Column Mappings

### PUT /api/v1/pipelines/:id/mappings

Save column mappings and transformations for all table pairs.

```json
[
  {
    "sourceTable": "src_customers",
    "executionOrder": 0,
    "targetMappings": [
      {
        "targetTable": "tgt_customers",
        "writeMode": "UPSERT",
        "columnMappings": [
          {
            "sourceColumn": "first_name",
            "targetColumn": "full_name",
            "mappingOrder": 0,
            "transformations": [
              { "functionName": "UPPER", "executionOrder": 0 },
              { "functionName": "TRIM", "executionOrder": 1 }
            ]
          }
        ]
      }
    ]
  }
]
```

## Monitoring

### GET /api/v1/pipelines/:id/monitor

Get current migration status, throughput, and progress.

### GET /api/v1/pipelines/:id/errors

Get error logs with pagination.

Query params: `page` (default 0), `size` (default 20), `type` (filter by error type).

### DELETE /api/v1/pipelines/:id/errors

Clear all error logs for a pipeline.
