import React from 'react';
import AdapterSelectDropdown from './AdapterSelectDropdown';
import { SOURCE_ADAPTER_LIST } from './adapterConstants';
import WizardSourceFields from './WizardSourceFields';

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

      <AdapterSelectDropdown
        id={id}
        label="Source Technology Adapter"
        adapters={SOURCE_ADAPTER_LIST}
        selectedId={selectedAdapter}
        onSelect={handleSelectAdapter}
      />

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
