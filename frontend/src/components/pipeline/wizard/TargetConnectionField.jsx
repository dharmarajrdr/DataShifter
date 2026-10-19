import React from 'react';

/**
 * Filtered Connection selector for Relational & GCP targets (<= 100 lines).
 */
export const TargetConnectionField = ({ id, adapter, config, setConfig, connections = [], errors = {} }) => {
  const isOracle = adapter === 'oracle-writer' || adapter.includes('oracle');
  const isSpanner = adapter.includes('spanner');
  const isBq = adapter.includes('bigquery');
  const isBt = adapter.includes('bigtable');
  const labelText = isOracle ? 'Oracle' : isSpanner ? 'Spanner' : isBq ? 'BigQuery' : isBt ? 'BigTable' : 'PostgreSQL';
  const targetType = isOracle ? 'ORACLE' : isSpanner ? 'SPANNER' : isBq ? 'BIGQUERY' : isBt ? 'BIGTABLE' : 'POSTGRESQL';

  const filtered = connections.filter((c) => {
    const t = (c.dbType || '').toUpperCase();
    return t === targetType || (targetType === 'POSTGRESQL' && t === 'POSTGRES');
  });

  return (
    <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {labelText} Target Connection *
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          {filtered.length} {labelText} connection{filtered.length === 1 ? '' : 's'} available
        </span>
      </div>
      <select
        id={`${id}-conn-select`}
        className="w-full max-w-[320px] px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        style={{ borderColor: errors.target ? '#EF4444' : undefined }}
        value={config.target || ''}
        onChange={(e) => setConfig({ ...config, target: e.target.value })}
      >
        <option value="">{`Select ${labelText} target connection...`}</option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>{c.name} ({c.dbType})</option>
        ))}
      </select>
      {errors.target && <p id={`${id}-target-error`} className="text-xs text-rose-500 mt-1">{errors.target}</p>}
      {filtered.length === 0 && (
        <p className="text-[11px] text-amber-600">
          No {labelText} connections configured. Create one in Connections.
        </p>
      )}
    </div>
  );
};

export default TargetConnectionField;
