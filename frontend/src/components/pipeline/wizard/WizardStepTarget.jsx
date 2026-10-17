import React from 'react';
import AdapterSelectDropdown from './AdapterSelectDropdown';
import { TARGET_ADAPTER_LIST } from './adapterConstants';
import WizardTargetFields from './WizardTargetFields';

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

      <AdapterSelectDropdown
        id={id}
        label="Target Destination Adapter"
        adapters={TARGET_ADAPTER_LIST}
        selectedId={selectedAdapter}
        onSelect={handleSelectAdapter}
      />

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
