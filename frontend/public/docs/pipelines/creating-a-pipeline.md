# Creating a pipeline

A pipeline defines the migration from one or more source tables to their corresponding target tables.

## Pipeline wizard

Click **New pipeline** on the Pipelines dashboard to open the wizard.

### Step 1: Basic info

- **Name** — descriptive name (e.g., "Customer Analytics Migration")
- **Description** — optional context
- **Namespace** — group for organizing pipelines (e.g., "Q1 Migration", "Analytics")

### Step 2: Select connections

Choose your **source** and **target** connections from the dropdown. Only tested, connected databases appear.

### Step 3: Select tables

DataShifter lists all tables from your source connection. Select the tables you want to migrate. For each source table, choose a target table.

> **Tip:** You can add or remove table pairs later from Pipeline Settings.

## Pipeline states

| State | Description |
|-------|-------------|
| DRAFT | Created but never run |
| RUNNING | Currently migrating data |
| PAUSED | Temporarily stopped, can resume |
| STOPPED | Manually stopped, restarts from beginning |
| COMPLETED | All rows migrated successfully |
| FAILED | Stopped due to error threshold exceeded |

## Namespaces

Namespaces group pipelines visually on the dashboard. Think of them like folders:

- **Default** — all pipelines start here
- Custom namespaces — create via the `+` button on the dashboard
- Drag pipelines between namespaces to reorganize
- Deleting a namespace moves its pipelines to Default

## What happens when you run a pipeline

1. Execution engine reads source table in chunks (default 10,000 rows)
2. Each chunk passes through filters (if configured)
3. Remaining rows are transformed column-by-column
4. Transformed rows are batch-written to the target
5. Progress is published to the Live Monitor via Kafka → SSE
6. Process repeats until all rows are migrated
