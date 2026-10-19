import React from 'react';
import { normalizeSchemaProperties, getPropertyValue, updateConfigProperty } from './adapterSchemaHelper';
import SourceConnectionField from './SourceConnectionField';

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
  const isCdc = adapterObj?.supportedMode === 'CDC' || adapter === 'oracle-trail' || adapter === 'oracle-gg-reader' || adapter === 'postgres-wal' || adapter === 'postgres-wal-reader' || adapter.includes('wal') || adapter.includes('trail') || adapter.includes('gg') || adapter.includes('cdc');

  if (isCdc) {
    const schemaProps = normalizeSchemaProperties(adapterObj || { id: adapter, alias: adapter });
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">{p.label} {p.required && <span className="text-rose-500">*</span>}</label>
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

  const isConnSupported = adapter.includes('oracle') || adapter.includes('postgres') || adapter.includes('spanner') || adapter.includes('bigquery') || adapter.includes('bigtable') || adapter.includes('s3') || adapter.includes('aws') || Boolean(adapterObj?.dbType);
  if (isConnSupported) {
    return <SourceConnectionField id={id} adapter={adapter} adapterObj={adapterObj} config={config} setConfig={setConfig} connections={connections} errors={errors} />;
  }

  const customSchema = normalizeSchemaProperties(adapterObj || { id: adapter, alias: adapter });
  if (customSchema.length > 0) {
    return (
      <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-row flex-wrap gap-3">
        {customSchema.map((p) => {
          const val = getPropertyValue(config, p);
          const isNum = p.type === 'number';
          return (
            <div key={p.key} className="w-full max-w-[320px]">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{p.label} {p.required && <span className="text-rose-500">*</span>}</label>
              <input id={`${id}-${p.key}`} type={isNum ? 'number' : 'text'} className={isNum ? NUM_CLS : INPUT_CLS} value={val ?? ''} placeholder={p.desc || String(p.default ?? '')} onChange={(e) => setConfig(updateConfigProperty(config, p.key, isNum ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value))} />
            </div>
          );
        })}
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
