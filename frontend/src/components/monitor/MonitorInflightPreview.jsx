import React, { useState, useMemo } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

const OP_CLASSES = {
  INSERT: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  UPDATE: 'bg-indigo-50 text-brand-700 border-indigo-200',
  DELETE: 'bg-red-50 text-status-danger border-red-200',
};

export const MonitorInflightPreview = ({
  records = [], isCdc = false, activeTable = '', targetTable = '', previewDisabled = false, status = 'RUNNING',
}) => {
  const [selectedTable, setSelectedTable] = useState('ALL');
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenRecords, setFrozenRecords] = useState(null);

  const toggleFreeze = () => {
    if (!isFrozen) { setFrozenRecords(records); setIsFrozen(true); }
    else { setFrozenRecords(null); setIsFrozen(false); }
  };

  const activeRecords = isFrozen && frozenRecords !== null ? frozenRecords : records;
  const tables = useMemo(() => isCdc ? Array.from(new Set(activeRecords.map((r) => r.table).filter(Boolean))) : [], [activeRecords, isCdc]);
  const filteredRecords = useMemo(() => {
    const list = isCdc && selectedTable !== 'ALL' ? activeRecords.filter((r) => r.table === selectedTable) : activeRecords;
    return list.slice(0, 25);
  }, [activeRecords, isCdc, selectedTable]);
  const columns = useMemo(() => filteredRecords.length === 0 ? [] : Object.keys(filteredRecords[0]).filter((k) => k !== 'table' && k !== 'op' && k !== 'id'), [filteredRecords]);

  if (previewDisabled) {
    return (
      <div id="preview-disabled-card" className="bg-white border border-surface-200 rounded-xl p-8 text-center text-xs text-content-secondary shadow-subtle">
        <Lock id="icon-preview-locked" className="w-6 h-6 text-content-tertiary mx-auto mb-2" />
        <p id="preview-locked-msg" className="font-semibold text-content-primary">In-flight records preview is disabled</p>
        <p id="preview-locked-sub" className="text-content-secondary mt-1">Enable it under Pipeline Settings → Data Privacy to inspect live records before target write.</p>
      </div>
    );
  }

  return (
    <div id="monitor-preview-card" className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-subtle flex flex-col text-xs">
      <div id="preview-card-header" className="px-5 py-3 border-b border-surface-200 flex items-center justify-between gap-3 flex-wrap bg-white">
        <div id="preview-title-box" className="flex items-center gap-2.5">
          <span id="preview-title" className="font-semibold text-content-primary text-sm">Real-Time In-Flight Records Preview</span>
          <span id="preview-badge" className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 tabular-nums">
            {filteredRecords.length} records {isFrozen ? '(Frozen)' : '(Streaming)'}
          </span>
        </div>
        <div id="preview-controls-group" className="flex items-center gap-2">
          <button id="btn-toggle-freeze" type="button" onClick={toggleFreeze} className={`px-2.5 py-1 text-xs font-medium rounded-md border flex items-center gap-1 ${isFrozen ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold' : 'bg-white text-content-secondary hover:text-content-primary border-surface-300'}`}>
            {isFrozen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}<span>{isFrozen ? 'Stream Frozen' : 'Freeze'}</span>
          </button>
        </div>
      </div>
      {isCdc && tables.length > 0 && (
        <div id="preview-cdc-tabs" className="px-4 bg-surface-50 border-b border-surface-200 flex items-center gap-1">
          <button id="tab-table-all" type="button" onClick={() => setSelectedTable('ALL')} className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${selectedTable === 'ALL' ? 'border-brand-600 text-brand-600 font-semibold bg-white' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>All Tables ({activeRecords.length})</button>
          {tables.map((t) => (
            <button key={t} id={`tab-table-${t}`} type="button" onClick={() => setSelectedTable(t)} className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${selectedTable === t ? 'border-brand-600 text-brand-600 font-semibold bg-white' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>{t} ({activeRecords.filter((r) => r.table === t).length})</button>
          ))}
        </div>
      )}
      {!isCdc && activeTable && (
        <div id="preview-il-active-banner" className="px-5 py-2 bg-surface-50 border-b border-surface-200 text-content-secondary flex items-center justify-between">
          <span>Active stage: <strong className="text-content-primary font-semibold">{activeTable}</strong> ➔ Target: <code className="font-mono text-brand-600">{targetTable || 'target_sink'}</code></span>
          <span className="text-[11px] font-semibold text-emerald-700">● In-Memory Stream</span>
        </div>
      )}
      <div id="preview-table-scroll" className="overflow-x-auto max-h-[380px]">
        {filteredRecords.length === 0 ? (
          <div id="preview-empty-state" className="p-8 text-center text-xs text-content-tertiary">{status === 'RUNNING' ? 'Waiting for in-flight records...' : 'No in-flight records in buffer.'}</div>
        ) : (
          <table id="preview-table" className="w-full text-left text-xs border-collapse">
            <thead id="preview-thead" className="bg-surface-50 border-b border-surface-200 text-content-secondary text-[11px] font-semibold uppercase sticky top-0 z-10 tracking-wider">
              <tr>
                <th id="th-idx" className="py-2 px-4 w-12">#</th>
                {isCdc && <th id="th-op" className="py-2 px-4">Op</th>}
                {isCdc && <th id="th-table" className="py-2 px-4">Table</th>}
                {columns.map((c) => <th key={c} id={`th-col-${c}`} className="py-2 px-4">{c}</th>)}
              </tr>
            </thead>
            <tbody id="preview-tbody" className="divide-y divide-surface-100">
              {filteredRecords.map((r, idx) => (
                <tr key={`${r.id || idx}`} id={`preview-row-${idx}`} className="hover:bg-surface-50 transition-colors">
                  <td id={`td-idx-${idx}`} className="py-2 px-4 font-mono text-content-tertiary tabular-nums">{idx + 1}</td>
                  {isCdc && <td id={`td-op-${idx}`} className="py-2 px-4"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${OP_CLASSES[r.op] || 'bg-surface-100 text-content-secondary'}`}>{r.op || 'INSERT'}</span></td>}
                  {isCdc && <td id={`td-table-${idx}`} className="py-2 px-4 font-mono text-content-primary">{r.table}</td>}
                  {columns.map((c) => <td key={c} id={`td-val-${idx}-${c}`} className="py-2 px-4 font-mono text-content-secondary truncate max-w-[200px]">{String(r[c] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MonitorInflightPreview;
