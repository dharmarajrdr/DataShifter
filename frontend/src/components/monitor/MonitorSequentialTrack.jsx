import React from 'react';
import { Check, Clock, Play } from 'lucide-react';

export const MonitorSequentialTrack = ({ overallProgress = 0, tables = [], rowsProcessed = 0, totalRows = 0 }) => {
  const activeTableIdx = tables.findIndex((t) => t.status === 'RUNNING' || (t.progress > 0 && t.progress < 100));
  const currentIdx = activeTableIdx >= 0 ? activeTableIdx : 0;
  const currentTable = tables[currentIdx];

  return (
    <div id="monitor-seq-track-card" className="bg-white border border-surface-200 rounded-xl p-5 shadow-subtle flex flex-col gap-4 text-xs">
      <div id="seq-progress-header" className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span id="seq-progress-title" className="text-sm font-semibold text-content-primary">Sequential Database Migration Progress</span>
          <p id="seq-progress-subtitle" className="text-content-secondary mt-0.5 tabular-nums">
            {rowsProcessed.toLocaleString()} {totalRows > 0 ? `of ${totalRows.toLocaleString()} rows transferred` : 'rows processed'} across {tables.length || 1} sequential table stages
          </p>
        </div>
        <span id="seq-progress-badge" className="text-sm font-bold text-brand-600 tabular-nums">
          {(overallProgress || 0).toFixed(1)}% Complete
        </span>
      </div>

      <div id="seq-overall-progress-track" className="h-2.5 bg-surface-200 rounded-full overflow-hidden">
        <div id="seq-overall-progress-fill" className="h-full bg-brand-600 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, overallProgress || 0))}%` }} />
      </div>

      {tables.length > 0 && (
        <div id="seq-steps-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {tables.map((t, idx) => {
            const isCompleted = t.status === 'COMPLETED' || t.progress >= 100;
            const isActive = idx === currentIdx && !isCompleted;
            const isQueued = !isCompleted && !isActive;

            return (
              <div
                key={t.name}
                id={`seq-step-box-${idx}`}
                className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${
                  isActive
                    ? 'bg-brand-50 border-brand-300 shadow-subtle'
                    : isCompleted
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-surface-50 border-surface-200 opacity-60'
                }`}
              >
                <div id={`seq-step-header-${idx}`} className="flex items-center justify-between gap-2">
                  <span id={`seq-step-title-${idx}`} className="font-semibold text-content-primary truncate">{idx + 1}. {t.name}</span>
                  <span id={`seq-step-status-${idx}`} className="text-[10.5px] font-semibold tabular-nums">
                    {isCompleted ? (
                      <span className="text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" /> Done</span>
                    ) : isActive ? (
                      <span className="text-brand-600 flex items-center gap-1"><Play className="w-3 h-3 animate-pulse" /> Active ({t.progress || 0}%)</span>
                    ) : (
                      <span className="text-content-secondary flex items-center gap-1"><Clock className="w-3 h-3" /> Queued</span>
                    )}
                  </span>
                </div>
                <div id={`seq-step-mini-track-${idx}`} className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                  <div
                    id={`seq-step-mini-fill-${idx}`}
                    className={`h-full rounded-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-brand-600'}`}
                    style={{ width: `${isCompleted ? 100 : Math.min(100, t.progress || 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MonitorSequentialTrack;
