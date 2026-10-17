import React from 'react';
import WizardTargetFields from './WizardTargetFields';

const TARGET_ADAPTERS = [
  { id: 's3-writer', name: 'Amazon S3 / Lakehouse', sub: 'Parquet / Delta Lake', icon: 'fa-cloud', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'kafka-writer', name: 'Apache Kafka Broker', sub: 'Event Stream Pipeline', icon: 'fa-share-nodes', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'postgres-writer', name: 'PostgreSQL Writer', sub: 'JDBC Batch / Upsert', icon: 'fa-database', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'snowflake-writer', name: 'Snowflake DW', sub: 'Cloud Data Warehouse', icon: 'fa-snowflake', color: 'text-sky-600', bg: 'bg-sky-50' },
];

/**
 * Step 3: Target Destination Adapter Selection & Credentials (<= 100 lines).
 */
export const WizardStepTarget = ({
  id = 'wizard-step-target',
  config,
  setConfig,
  connections = [],
  errors = {},
}) => {
  const selectedAdapter = config.targetAdapter || 's3-writer';

  const handleSelectAdapter = (adapterId) => {
    setConfig({
      ...config,
      targetAdapter: adapterId,
    });
  };

  return (
    <div id={id} className="wizard-step-target-panel w-full py-2">
      <div id={`${id}-header`} className="mb-4">
        <h3 id={`${id}-title`} className="text-base font-semibold text-slate-900">
          Select Target Destination Adapter
        </h3>
        <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">
          Choose where data should land. Security credentials and storage options adapt below.
        </p>
      </div>

      {/* Target Cards Grid */}
      <div id={`${id}-cards-grid`} className="grid grid-cols-2 gap-2.5 mb-4">
        {TARGET_ADAPTERS.map((adapter) => {
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

      {/* Dynamic Target Fields */}
      <WizardTargetFields
        id={`${id}-fields`}
        adapter={selectedAdapter}
        config={config}
        setConfig={setConfig}
        connections={connections}
      />
    </div>
  );
};

export default WizardStepTarget;
