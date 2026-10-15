import React from 'react';
import { Radio, ArrowRight, CheckCircle2, XCircle, PauseCircle } from 'lucide-react';
import { Button, StatusBadge } from '../common';

/**
 * Grid of live pipeline stream monitors with instant telemetry launch (<= 100 lines).
 */
export const MonitoringHubGrid = ({
  id = 'monitoring-hub-grid',
  pipelines = [],
  navigate,
}) => {
  if (pipelines.length === 0) {
    return (
      <div id={`${id}-empty`} className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
        <Radio id={`${id}-empty-icon`} className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h4 id={`${id}-empty-title`} className="font-semibold text-slate-800">No pipelines match your filter</h4>
        <p id={`${id}-empty-desc`} className="text-xs text-slate-500 mt-1">Try switching to a different status or clearing search keywords.</p>
      </div>
    );
  }

  return (
    <div id={id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pipelines.map((p) => {
        const isRunning = p.status === 'RUNNING';
        const isCdc = p.mode === 'CDC' || p.isCdc;

        return (
          <div
            key={p.id}
            id={`${id}-card-${p.id}`}
            className="ds-monitor-card bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div id={`${id}-card-top-${p.id}`} className="space-y-3">
              <div id={`${id}-header-${p.id}`} className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />}
                    <h4 id={`${id}-name-${p.id}`} className="font-bold text-sm text-slate-900 truncate">
                      {p.name}
                    </h4>
                  </div>
                  <p id={`${id}-ns-${p.id}`} className="text-[11px] text-slate-500 font-medium">
                    {p.namespace || 'default'}
                  </p>
                </div>
                <StatusBadge status={p.status || 'STOPPED'} />
              </div>

              <div id={`${id}-route-${p.id}`} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700 truncate">{p.sourceConnector || p.sourceType || 'Source'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700 truncate">{p.targetConnector || p.targetType || 'Target'}</span>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                  {isCdc ? 'CDC' : 'BATCH'}
                </span>
              </div>

              <div id={`${id}-stats-${p.id}`} className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-slate-50/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Processed</span>
                  <span className="font-mono font-semibold text-slate-800">{(p.rowsProcessed || p.recordsTotal || 0).toLocaleString()} rows</span>
                </div>
                <div className="bg-slate-50/60 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Lag / Speed</span>
                  <span className="font-mono font-semibold text-slate-800">{p.lagSeconds != null ? `${p.lagSeconds}s lag` : (p.throughput || '0 r/s')}</span>
                </div>
              </div>
            </div>

            <div id={`${id}-card-footer-${p.id}`} className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span id={`${id}-status-note-${p.id}`} className="text-[11px] text-slate-500 truncate">
                {isRunning ? 'Streaming events' : 'Offline / idle'}
              </span>
              <Button
                id={`${id}-launch-btn-${p.id}`}
                variant="primary"
                size="sm"
                onClick={() => navigate(`/pipelines/${p.id}/monitor`)}
              >
                Live Monitor
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MonitoringHubGrid;
