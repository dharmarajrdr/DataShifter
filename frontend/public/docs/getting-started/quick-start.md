# Quick start

Get your first migration running in 5 minutes.

## Prerequisites

- A running DataShifter instance (or `./services.sh` for local dev)
- Source database with data to migrate
- Target database with pre-created tables

## Step 1: Create connections

Navigate to **Connections** in the sidebar and create two connections — one for your source database and one for your target.

Click **New connection** and fill in:

| Field | Example |
|-------|---------|
| Name | Production Oracle |
| Type | Oracle / PostgreSQL / Spanner |
| Host | `db.example.com` |
| Port | `5432` |
| Database | `mydb` |
| Schema | `public` |
| Username | `readonly_user` |
| Password | `••••••••` |

Click **Test connection** to verify connectivity. You should see the table count and latency.

## Step 2: Create a pipeline

Navigate to **Pipelines** → **New pipeline**.

1. **Name your pipeline** — e.g., "Customer Migration"
2. **Select source connection** — pick the connection you just created
3. **Select target connection** — pick the target
4. **Choose tables** — select which source tables to migrate
5. **Map to target tables** — DataShifter auto-suggests matches

## Step 3: Map columns

After creating the pipeline, open the **Column Mapping** board. Here you can:

- Drag source columns to target columns
- Add **transforms** (UPPER, TRIM, TO_DATE, etc.)
- Set **system values** (CURRENT_TIMESTAMP, UUID, ROW_NUMBER)
- Add **filters** to skip certain rows

## Step 4: Run the migration

Go to the **Live Monitor** and click **Start**. Watch your data flow in real-time:

- **Rows/sec** — instantaneous throughput
- **Avg rows/sec** — sustained throughput
- **ETA** — estimated time remaining
- **In-flight records** — live preview of migrating data

## Step 5: Review results

After completion, the monitor shows "Completed in Xmin Ysec". Check the **Error logs** tab for any failed rows.

> **Tip:** Enable "Ignore exceptions" in Pipeline Settings to continue migration even when individual rows fail. Failed rows are logged for review.
