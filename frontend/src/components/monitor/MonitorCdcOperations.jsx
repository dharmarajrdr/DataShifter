import React from 'react';

export const MonitorCdcOperations = ({ insertCount = 0, updateCount = 0, deleteCount = 0, filteredCount = 0 }) => (
  <div id="monitor-cdc-ops-bar" className="bg-white border border-surface-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap shadow-subtle text-xs">
    <div id="cdc-ops-chips-group" className="flex items-center gap-2 flex-wrap">
      <strong id="cdc-ops-title" className="text-content-primary font-semibold">Operations Breakdown:</strong>
      <span id="cdc-chip-inserts" className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium tabular-nums">
        Inserts: {(insertCount || 0).toLocaleString()}
      </span>
      <span id="cdc-chip-updates" className="px-2.5 py-1 rounded-md bg-indigo-50 text-brand-700 border border-indigo-200 font-medium tabular-nums">
        Updates: {(updateCount || 0).toLocaleString()}
      </span>
      <span id="cdc-chip-deletes" className="px-2.5 py-1 rounded-md bg-surface-100 text-content-secondary border border-surface-200 font-medium tabular-nums">
        Deletes: {(deleteCount || 0).toLocaleString()}
      </span>
      {filteredCount > 0 && (
        <span id="cdc-chip-filtered" className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium tabular-nums">
          Filtered: {(filteredCount || 0).toLocaleString()}
        </span>
      )}
    </div>
    <span id="cdc-replay-label" className="text-xs text-content-secondary font-medium">
      Micro-batch Replay Engine Active
    </span>
  </div>
);

export default MonitorCdcOperations;
