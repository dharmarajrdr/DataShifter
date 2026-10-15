import React from 'react';

export const MonitorMetricsGrid = ({ data = {}, isCdc = false, isWal = true }) => {
  const cdcMetrics = [
    { id: 'lsn', label: isWal ? 'Current LSN' : 'Current SCN', val: data.currentLsn || data.currentScn || (data.eta?.startsWith('LSN:') ? data.eta.replace('LSN: ', '') : 'Tracking...'), sub: isWal ? 'PostgreSQL WAL Segment' : 'Oracle SCN', color: 'text-teal-700 font-mono text-base' },
    { id: 'lag', label: 'Replication Lag', val: data.lagSeconds != null ? `${data.lagSeconds}s` : '< 1s', sub: 'Real-time sync', color: data.lagSeconds > 30 ? 'text-status-danger' : 'text-status-success' },
    { id: 'events', label: 'Events Streamed', val: (data.totalRowsProcessed || data.rowsProcessed || 0).toLocaleString(), sub: 'Across captured tables', color: 'text-content-primary' },
    { id: 'rate', label: 'Throughput', val: `${(data.rowsPerSec || 0).toLocaleString()} evt/s`, sub: '▲ Ingestion velocity', color: 'text-brand-600' },
    { id: 'source-file', label: isWal ? 'Active WAL Segment' : 'Active Trail File', val: data.currentSourceFile || data.cdcFilePattern || (isWal ? '000000010000.*' : 'aa.*'), sub: 'Micro-batch replay buffer', color: 'text-content-secondary font-mono text-xs' },
  ];

  const batchMetrics = [
    { id: 'rows', label: 'Rows Processed', val: (data.rowsProcessed || 0).toLocaleString(), sub: 'Target table writes', color: 'text-content-primary' },
    { id: 'rate', label: 'Current Rate', val: `${(data.rowsPerSec || 0).toLocaleString()} rows/s`, sub: 'Real-time velocity', color: 'text-brand-600' },
    { id: 'avg-rate', label: 'Average Rate', val: `${(data.avgRowsPerSec || 0).toLocaleString()} rows/s`, sub: 'Sustained throughput', color: 'text-indigo-600' },
    { id: 'errors', label: 'Errors Skipped', val: (data.errorsSkipped || 0).toLocaleString(), sub: 'Quarantined tuples', color: (data.errorsSkipped > 0) ? 'text-status-danger' : 'text-status-success' },
    { id: 'eta', label: 'Estimated Remaining', val: data.eta || '—', sub: 'Remaining table duration', color: 'text-sky-700' },
  ];

  const metrics = isCdc ? cdcMetrics : batchMetrics;

  return (
    <div id="monitor-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {metrics.map((m) => (
        <div key={m.id} id={`metric-card-${m.id}`} className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle flex flex-col gap-1 transition-all hover:border-surface-300">
          <span id={`metric-label-${m.id}`} className="text-xs font-medium text-content-secondary">{m.label}</span>
          <span id={`metric-val-${m.id}`} className={`text-xl font-semibold tabular-nums truncate ${m.color}`}>{m.val}</span>
          <span id={`metric-sub-${m.id}`} className="text-[11px] text-content-secondary">{m.sub}</span>
        </div>
      ))}
    </div>
  );
};

export default MonitorMetricsGrid;
