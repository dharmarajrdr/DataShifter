import React from 'react';
import { normalizeSchemaProperties, getPropertyValue, updateConfigProperty } from './adapterSchemaHelper';

const INPUT_CLS = 'w-full max-w-[320px] px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';
const NUM_CLS = 'w-full max-w-[320px] px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';

export const WizardSourceFields = ({
  id = 'wizard-source-fields',
  adapter = 'oracle-jdbc',
  adapterObj,
  config = {},
  setConfig,
  connections = [],
  errors = {},
}) => {
  const schemaProps = normalizeSchemaProperties(adapterObj || { id: adapter, alias: adapter });

  if (schemaProps.length > 0) {
    return (
      <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-row flex-wrap gap-3">
        {schemaProps.map((p) => {
          const val = getPropertyValue(config, p);
          const isNum = p.type === 'number';
          const inputId = p.key === 'walDirectory' ? `${id}-wal-dir` :
            p.key === 'slotName' ? `${id}-wal-slot` :
            p.key === 'trailDirPath' ? `${id}-gg-dir` :
            p.key === 'startingScn' ? `${id}-gg-scn` :
            `${id}-${p.key}`;

          return (
            <div key={p.key} className="w-full max-w-[320px]">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {p.label} {p.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                id={inputId}
                type={isNum ? 'number' : 'text'}
                className={isNum ? NUM_CLS : INPUT_CLS}
                value={val ?? ''}
                placeholder={p.desc || String(p.default ?? '')}
                onChange={(e) => setConfig(updateConfigProperty(config, p.key, isNum ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value))}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const isOracle = adapter.includes('oracle');
  const isSpanner = adapter.includes('spanner');
  const isBq = adapter.includes('bigquery');
  const isBt = adapter.includes('bigtable');
  const isPg = adapter.includes('postgres');

  if (isOracle || isPg || isSpanner || isBq || isBt) {
    const labelText = isOracle ? 'Oracle' : isSpanner ? 'Spanner' : isBq ? 'BigQuery' : isBt ? 'BigTable' : 'PostgreSQL';
    const targetType = isOracle ? 'ORACLE' : isSpanner ? 'SPANNER' : isBq ? 'BIGQUERY' : isBt ? 'BIGTABLE' : 'POSTGRESQL';
    const filtered = connections.filter((c) => {
      const t = (c.dbType || '').toUpperCase();
      return t === targetType || (targetType === 'POSTGRESQL' && t === 'POSTGRES');
    });

    return (
      <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-row flex-wrap gap-3">
        <div className="w-full max-w-[320px]">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">{labelText} Source Connection *</label>
            <span className="text-[11px] text-slate-500 font-medium">{filtered.length} available</span>
          </div>
          <select id={`${id}-conn-select`} className={NUM_CLS} style={{ borderColor: errors.source ? '#EF4444' : undefined }} value={config.source || ''} onChange={(e) => setConfig({ ...config, source: e.target.value })}>
            <option value="">{`Select ${labelText} connection...`}</option>
            {filtered.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.dbType})</option>))}
          </select>
          {errors.source && <p id={`${id}-source-error`} className="text-xs text-rose-500 mt-1">{errors.source}</p>}
          {filtered.length === 0 && <p className="text-[11px] text-amber-600 mt-1">No {labelText} connections configured.</p>}
        </div>
      </div>
    );
  }

  return (
    <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
      No additional configuration required for this adapter.
    </div>
  );
};

export default WizardSourceFields;
