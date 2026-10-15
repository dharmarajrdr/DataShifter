import React from 'react';

/**
 * Dynamic parameter fields for chosen Source Adapter (<= 100 lines).
 */
export const WizardSourceFields = ({
  id = 'wizard-source-fields',
  adapter = 'oracle-trail',
  config,
  setConfig,
  connections = [],
}) => {
  if (adapter === 'oracle-trail') {
    return (
      <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trail Directory *</label>
            <input id={`${id}-gg-dir`} className="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.cdcDirectoryPath || ''} onChange={(e) => setConfig({ ...config, cdcDirectoryPath: e.target.value })} placeholder="/u01/app/oracle/dirdat" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trail File Pattern</label>
            <input id={`${id}-gg-pattern`} className="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.cdcFilePattern || 'aa.*'} onChange={(e) => setConfig({ ...config, cdcFilePattern: e.target.value })} placeholder="aa.*" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Starting SCN / RBA</label>
            <input id={`${id}-gg-scn`} className="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.cdcStartingScn || ''} onChange={(e) => setConfig({ ...config, cdcStartingScn: e.target.value })} placeholder="0 (Head)" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Flush Interval (ms)</label>
            <input id={`${id}-gg-flush`} type="number" className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white" value={config.cdcFlushIntervalMs || 200} onChange={(e) => setConfig({ ...config, cdcFlushIntervalMs: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Max Batch Size</label>
            <input id={`${id}-gg-batch`} type="number" className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white" value={config.cdcBatchSize || 500} onChange={(e) => setConfig({ ...config, cdcBatchSize: e.target.value })} />
          </div>
        </div>
      </div>
    );
  }

  if (adapter === 'postgres-wal') {
    return (
      <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">WAL Directory</label>
            <input id={`${id}-wal-dir`} className="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.cdcDirectoryPath || ''} onChange={(e) => setConfig({ ...config, cdcDirectoryPath: e.target.value })} placeholder="/var/lib/postgresql/data/pg_wal" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Replication Slot</label>
            <input id={`${id}-wal-slot`} className="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.cdcSlotName || 'datashifter_cdc_slot'} onChange={(e) => setConfig({ ...config, cdcSlotName: e.target.value })} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
      <label className="block text-xs font-semibold text-slate-700 mb-1">Source Connection</label>
      <select id={`${id}-conn-select`} className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white" value={config.source || ''} onChange={(e) => setConfig({ ...config, source: e.target.value })}>
        <option value="">Select source database connection...</option>
        {connections.map((c) => (
          <option key={c.id} value={c.id}>{c.name} ({c.dbType})</option>
        ))}
      </select>
    </div>
  );
};

export default WizardSourceFields;
