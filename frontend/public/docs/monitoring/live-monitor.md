# Live monitor

The Live Monitor provides real-time visibility into running migrations.

## Metrics

| Metric | Description |
|--------|-------------|
| **Rows processed** | Total rows written to target |
| **Rows/sec** | Instantaneous throughput |
| **Avg rows/sec** | Sustained throughput (excludes paused time) |
| **Errors skipped** | Rows that failed but were skipped (when ignore_exceptions is on) |
| **Overall progress** | Percentage complete across all tables |
| **ETA** | Estimated time remaining (based on avg throughput) |

On completion, ETA changes to show the actual migration time: "Completed in 3min 12sec" (excludes paused duration).

## In-flight records

The bottom section shows a live table of records currently being migrated. This updates with every chunk.

### Privacy mode

For sensitive data, disable in-flight preview in **Pipeline Settings → Data privacy**. When disabled, the monitor shows a 🔒 icon instead of record data.

## Pipeline controls

| Button | Action |
|--------|--------|
| **Start** | Begin migration from the beginning |
| **Resume** | Continue from where it paused |
| **Pause** | Temporarily stop (can resume) |
| **Stop** | Hard stop (restarts from beginning) |


# Real-time delivery

Events are delivered via **Server-Sent Events (SSE)**:

```
Execution Engine → Kafka → Notification Service → SSE → Browser
```

The browser receives progress updates within milliseconds of each chunk completing. No polling required.
