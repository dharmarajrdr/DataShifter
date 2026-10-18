import React from 'react';
import { RotateCw, Radio, AlertCircle } from 'lucide-react';

export const MonitorTelemetryBar = ({
  connected = false, exhausted = false, reconnectCount = 0, updateCount = 0,
  lagSeconds, currentLsn, onRefresh, onRetry, isCdc = false, isRunning = false,
  status,
}) => {
  const isTerminalOrDraft = status && ['COMPLETED', 'ERRORED', 'PAUSED', 'DRAFT', 'NOT_VALIDATED', 'INVALID'].includes(status);
  const active = !isTerminalOrDraft && (isRunning || connected || status === 'RUNNING');

  return (
    <div id="monitor-telemetry-bar" className="bg-white border border-surface-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 shadow-subtle flex-wrap text-xs">
      <div id="telemetry-left" className="flex items-center gap-3">
        {!active ? (
          <span id="telemetry-inactive" className="inline-flex items-center gap-1.5 font-medium text-surface-500">
            <span id="telemetry-inactive-dot" className="w-2 h-2 rounded-full bg-surface-400" />
            <span>Telemetry Stream: Inactive</span>
          </span>
        ) : connected ? (
          <span id="telemetry-connected" className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
            <span id="telemetry-live-dot" className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Stream: Active</span>
          </span>
        ) : exhausted ? (
          <span id="telemetry-exhausted" className="inline-flex items-center gap-1.5 font-semibold text-status-danger">
            <AlertCircle id="telemetry-alert-icon" className="w-3.5 h-3.5" />
            <span>Stream Disconnected</span>
            <button id="btn-telemetry-retry" type="button" onClick={onRetry} className="text-brand-600 underline hover:text-brand-700 ml-1">Retry</button>
          </span>
        ) : (
          <span id="telemetry-reconnecting" className="inline-flex items-center gap-1.5 font-medium text-amber-700">
            <Radio id="telemetry-radio-icon" className="w-3.5 h-3.5 animate-spin" />
            <span>Reconnecting {reconnectCount > 0 ? `(${reconnectCount}/5)` : ''}...</span>
          </span>
        )}
        <span id="telemetry-sep-1" className="text-surface-300">•</span>
        <span id="telemetry-lag-info" className="text-content-secondary tabular-nums">
          {isCdc ? (
            <>Replication Lag: <strong id="telemetry-lag-val" className={lagSeconds > 30 ? 'text-status-danger font-semibold' : 'text-emerald-700 font-semibold'}>{lagSeconds != null ? `${lagSeconds}s` : '< 1s'}</strong></>
          ) : (
            <>Batch Sync Engine: <strong id="telemetry-batch-status" className={active ? 'text-brand-600 font-semibold' : 'text-surface-500 font-medium'}>{active ? 'Active' : 'Standby'}</strong></>
          )}
        </span>
      {currentLsn && (
        <>
          <span id="telemetry-sep-2" className="text-surface-300">•</span>
          <span id="telemetry-lsn-info" className="text-content-secondary">
            LSN: <code id="telemetry-lsn-code" className="font-mono text-teal-700 font-semibold">{currentLsn}</code>
          </span>
        </>
      )}
    </div>
    <div id="telemetry-right" className="flex items-center gap-2 text-content-secondary tabular-nums">
      {updateCount > 0 && <span id="telemetry-updates-count" className="text-[11px]">{updateCount} events received</span>}
      <button
        id="btn-telemetry-refresh"
        type="button"
        onClick={onRefresh}
        title="Refresh live metrics"
        className="p-1 rounded-md border border-surface-200 hover:bg-surface-50 text-content-secondary hover:text-content-primary transition-colors"
      >
        <RotateCw id="icon-refresh" className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
};

export default MonitorTelemetryBar;
