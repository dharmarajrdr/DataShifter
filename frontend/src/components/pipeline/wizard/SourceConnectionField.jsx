import React from 'react';

const NUM_CLS = 'w-full max-w-[320px] px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';

export const SourceConnectionField = ({ id, adapter, adapterObj, config, setConfig, connections = [], errors = {} }) => {
  const isOracle = adapter.includes('oracle');
  const isSpanner = adapter.includes('spanner');
  const isBq = adapter.includes('bigquery');
  const isBt = adapter.includes('bigtable');
  const isAws = adapter.includes('s3') || adapter.includes('aws');
  const dbType = adapterObj?.dbType || (isOracle ? 'ORACLE' : isSpanner ? 'SPANNER' : isBq ? 'BIGQUERY' : isBt ? 'BIGTABLE' : isAws ? 'S3' : 'POSTGRESQL');
  const labelText = dbType === 'ORACLE' ? 'Oracle' : dbType === 'SPANNER' ? 'Spanner' : dbType === 'BIGQUERY' ? 'BigQuery' : dbType === 'BIGTABLE' ? 'BigTable' : dbType === 'S3' ? 'AWS' : 'PostgreSQL';

  const filtered = connections.filter((c) => {
    const t = (c.dbType || '').toUpperCase();
    return t === dbType || (dbType === 'POSTGRESQL' && t === 'POSTGRES');
  });

  return (
    <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-row flex-wrap gap-3">
      <div className="w-full max-w-[320px]">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-slate-700">{labelText} Source Connection *</label>
          <span className="text-[11px] text-slate-500 font-medium">{filtered.length} {labelText} connection{filtered.length === 1 ? '' : 's'} available</span>
        </div>
        <select
          id={`${id}-conn-select`}
          className={NUM_CLS}
          style={{ borderColor: errors.source ? '#EF4444' : undefined }}
          value={config.source || ''}
          onChange={(e) => setConfig({ ...config, source: e.target.value })}
        >
          <option value="">{`Select ${labelText} source connection...`}</option>
          {filtered.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.dbType})</option>))}
        </select>
        {errors.source && <p id={`${id}-source-error`} className="text-xs text-rose-500 mt-1">{errors.source}</p>}
        {filtered.length === 0 && <p className="text-[11px] text-amber-600 mt-1">No {labelText} connections configured. Create one in Connections.</p>}
      </div>
    </div>
  );
};

export default SourceConnectionField;

