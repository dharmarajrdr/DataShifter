import React from 'react';
import { AlertTriangle, Play, Pause, Square, Download } from 'lucide-react';

const STATUS_BADGES = {
  RUNNING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-brand-50 text-brand-700 border-brand-200',
  ERRORED: 'bg-red-50 text-red-700 border-red-200',
  VALIDATED: 'bg-sky-50 text-sky-700 border-sky-200',
};

export const MonitorHeader = ({
  pipelineName = 'Pipeline', status = 'RUNNING', isCdc = false, isLockedToWorkflow = false,
  workflowName, onAction, onNavigate, canViewErrors = true, canEditSettings = true,
  actionLoading, exportLoading, errorCount = 0,
}) => (
  <header id="monitor-header" className="bg-white border-b border-surface-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
    <div id="monitor-header-left" className="flex flex-col gap-1">
      <nav id="monitor-breadcrumbs" className="flex items-center gap-1.5 text-xs text-content-secondary">
        <button id="breadcrumb-pipelines-btn" type="button" onClick={() => onNavigate('/pipelines')} className="text-brand-600 hover:underline font-medium">Pipelines</button>
        <span id="breadcrumb-sep-1">/</span>
        <span id="breadcrumb-current-pipeline" className="truncate max-w-[200px]">{pipelineName}</span>
        <span id="breadcrumb-sep-2">/</span>
        <strong id="breadcrumb-monitor-label" className="text-content-primary font-semibold">Live Monitor</strong>
      </nav>
      <div id="monitor-title-row" className="flex items-center gap-3">
        <h1 id="monitor-pipeline-title" className="text-lg font-semibold text-content-primary tracking-tight">{pipelineName}</h1>
        <span id="monitor-status-pill" className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${STATUS_BADGES[status] || STATUS_BADGES.RUNNING}`}>
          {status === 'RUNNING' && <span id="monitor-pulse-dot" className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          <span id="monitor-status-text">{status}</span>
        </span>
        {isCdc && (
          <span id="monitor-cdc-badge" data-testid="cdc-streaming-badge" className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            CDC Stream Active
          </span>
        )}
      </div>
    </div>
    <div id="monitor-header-actions" className="flex items-center gap-2 flex-wrap">
      <button id="btn-monitor-errors" type="button" onClick={() => onNavigate('errors')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-status-danger bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg shadow-subtle transition-colors">
        <AlertTriangle id="icon-error-logs" className="w-3.5 h-3.5" />
        <span id="label-error-logs">Error logs {errorCount > 0 ? `(${errorCount})` : ''}</span>
      </button>
      <button id="btn-monitor-mapping" type="button" onClick={() => onNavigate('mapping')} className="px-3 py-1.5 text-xs font-medium text-content-primary bg-white hover:bg-surface-50 border border-surface-300 rounded-lg shadow-subtle transition-colors">Column mapping</button>
      <button id="btn-monitor-settings" type="button" disabled={!canEditSettings} onClick={() => onNavigate('settings')} className="px-3 py-1.5 text-xs font-medium text-content-primary bg-white hover:bg-surface-50 border border-surface-300 rounded-lg shadow-subtle transition-colors disabled:opacity-50">Settings</button>
      {status === 'RUNNING' && (
        <button id="btn-action-pause" type="button" onClick={() => onAction('PAUSE')} disabled={!!actionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors">
          <Pause id="icon-pause" className="w-3.5 h-3.5" /><span>{actionLoading === 'PAUSE' ? 'Pausing...' : 'Pause'}</span>
        </button>
      )}
      {status === 'PAUSED' && (
        <button id="btn-action-resume" type="button" onClick={() => onAction('RESUME')} disabled={!!actionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-hover rounded-lg transition-colors">
          <Play id="icon-resume" className="w-3.5 h-3.5" /><span>{actionLoading === 'RESUME' ? 'Resuming...' : 'Resume'}</span>
        </button>
      )}
      {(status === 'RUNNING' || status === 'PAUSED') && (
        <button id="btn-action-stop" type="button" onClick={() => onAction('STOP')} disabled={!!actionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-status-danger bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors">
          <Square id="icon-stop" className="w-3.5 h-3.5" /><span>{actionLoading === 'STOP' ? 'Stopping...' : 'Stop'}</span>
        </button>
      )}
      <button id="btn-action-export" type="button" onClick={() => onAction('EXPORT')} disabled={exportLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-content-secondary hover:text-content-primary bg-white border border-surface-300 rounded-lg shadow-subtle transition-colors">
        <Download id="icon-export" className="w-3.5 h-3.5" /><span>{exportLoading ? 'Exporting...' : 'Export'}</span>
      </button>
    </div>
  </header>
);

export default MonitorHeader;
