import React from 'react';
import WizardSourceFields from './WizardSourceFields';

const SOURCE_ADAPTERS = [
  { id: 'oracle-trail', name: 'Oracle GoldenGate Trail', sub: 'Binary Trail CDC', icon: 'fa-server', color: 'text-rose-600', bg: 'bg-rose-50' },
  { id: 'postgres-wal', name: 'PostgreSQL WAL Reader', sub: 'Logical Replication', icon: 'fa-bolt', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'postgres-jdbc', name: 'PostgreSQL JDBC Reader', sub: 'Direct DB Query', icon: 'fa-database', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'filesystem', name: 'FileSystem Ingestion', sub: 'Parquet / CSV / JSONL', icon: 'fa-folder-open', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

/**
 * Step 2: Source Adapter Selection & Dynamic Parameters (<= 100 lines).
 */
export const WizardStepSource = ({
  id = 'wizard-step-source',
  config,
  setConfig,
  connections = [],
  errors = {},
}) => {
  const selectedAdapter = config.sourceAdapter || 'oracle-trail';

  const handleSelectAdapter = (adapterId) => {
    const isCdc = adapterId === 'oracle-trail' || adapterId === 'postgres-wal';
    setConfig({
      ...config,
      sourceAdapter: adapterId,
      pipelineMode: isCdc ? 'CDC' : 'BATCH',
      cdcLogType: adapterId === 'oracle-trail' ? 'ORACLE_TRAIL' : adapterId === 'postgres-wal' ? 'POSTGRES_WAL' : null,
      cdcFilePattern: adapterId === 'oracle-trail' ? 'aa.*' : adapterId === 'postgres-wal' ? '000000010000.*' : '',
    });
  };

  return (
    <div id={id} className="wizard-step-source-panel w-full py-2">
      <div id={`${id}-header`} className="mb-4">
        <h3 id={`${id}-title`} className="text-base font-semibold text-slate-900">
          Select Source Adapter
        </h3>
        <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">
          Choose your data source technology. Relevant parameters and reader controls adapt below.
        </p>
      </div>

      {/* Adapter Cards Grid */}
      <div id={`${id}-cards-grid`} className="grid grid-cols-2 gap-2.5 mb-4">
        {SOURCE_ADAPTERS.map((adapter) => {
          const isSelected = selectedAdapter === adapter.id;
          return (
            <div
              key={adapter.id}
              id={`${id}-card-${adapter.id}`}
              onClick={() => handleSelectAdapter(adapter.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${adapter.bg} ${adapter.color}`}>
                <i className={`fa-solid ${adapter.icon} text-sm`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">{adapter.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{adapter.sub}</div>
              </div>
              {isSelected && (
                <i className="fa-solid fa-circle-check text-indigo-600 text-xs shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Dynamic Fields for Chosen Source Adapter */}
      <WizardSourceFields
        id={`${id}-fields`}
        adapter={selectedAdapter}
        config={config}
        setConfig={setConfig}
        connections={connections}
        errors={errors}
      />
    </div>
  );
};

export default WizardStepSource;
