import React from 'react';

/**
 * Filtered Connection selector for Oracle & PostgreSQL targets (<= 100 lines).
 */
export const TargetConnectionField = ({ id, adapter, config, setConfig, connections = [] }) => {
  const isOracle = adapter === 'oracle-writer';
  const labelText = isOracle ? 'Oracle' : 'PostgreSQL';

  const filtered = connections.filter((c) => {
    const t = (c.dbType || '').toUpperCase();
    return isOracle ? t === 'ORACLE' : (t === 'POSTGRESQL' || t === 'POSTGRES');
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
        className="w-full max-w-[320px] px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        value={config.target || ''}
        onChange={(e) => setConfig({ ...config, target: e.target.value })}
      >
        <option value="">{`Select ${labelText} target connection...`}</option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>{c.name} ({c.dbType})</option>
        ))}
      </select>
      {filtered.length === 0 && (
        <p className="text-[11px] text-amber-600">
          No {labelText} connections configured. Create one in Connections.
        </p>
      )}
    </div>
  );
};

export default TargetConnectionField;

