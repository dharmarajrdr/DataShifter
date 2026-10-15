import React from 'react';

/**
 * Step 4: Adaptive Datasets & Entities Mapping with sequential order (<= 100 lines).
 */
export const WizardStepEntities = ({ id = 'wizard-step-entities', config, setConfig }) => {
  const isStreamOrLake = ['s3-writer', 'kafka-writer', 'filesystem'].includes(config.targetAdapter || '');
  const pairs = config.entityPairs || [
    { sourceEntity: 'HR.CUSTOMERS', targetEntity: isStreamOrLake ? 'customers_parquet/' : 'customers' },
    { sourceEntity: 'SALES.ORDERS', targetEntity: isStreamOrLake ? 'orders_parquet/' : 'orders' },
  ];

  const updatePair = (index, field, value) => {
    const next = [...pairs];
    next[index] = { ...next[index], [field]: value };
    setConfig({
      ...config,
      entityPairs: next,
      selectedSourceTables: next.map((p) => p.sourceEntity),
      selectedTargetTables: next.map((p) => p.targetEntity),
    });
  };

  const addPair = () => {
    const next = [...pairs, { sourceEntity: '', targetEntity: '' }];
    setConfig({ ...config, entityPairs: next });
  };

  const removePair = (index) => {
    const next = pairs.filter((_, i) => i !== index);
    setConfig({
      ...config,
      entityPairs: next,
      selectedSourceTables: next.map((p) => p.sourceEntity),
      selectedTargetTables: next.map((p) => p.targetEntity),
    });
  };

  return (
    <div id={id} className="wizard-step-entities-panel max-w-2xl mx-auto py-2">
      <div id={`${id}-header`} className="mb-4 flex items-center justify-between">
        <div>
          <h3 id={`${id}-title`} className="text-base font-semibold text-slate-900">Configure Datasets &amp; Entity Pairing</h3>
          <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">Map capture tables to destination topics, folders, or tables with execution order.</p>
        </div>
        <button type="button" id={`${id}-add-btn`} onClick={addPair} className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all">
          <i className="fa-solid fa-plus text-xs" /><span>Add Entity</span>
        </button>
      </div>
      <div id={`${id}-list`} className="space-y-2.5">
        {pairs.map((pair, idx) => (
          <div key={idx} id={`${id}-row-${idx}`} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-xs">
            <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">#{idx + 1}</span>
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Source Entity / Capture Filter</label>
              <input id={`${id}-source-${idx}`} className="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-slate-50 focus:bg-white" value={pair.sourceEntity} onChange={(e) => updatePair(idx, 'sourceEntity', e.target.value)} placeholder="e.g., SCHEMA.TABLE or regex" />
            </div>
            <i className="fa-solid fa-arrow-right text-slate-400 text-xs mt-4" />
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{isStreamOrLake ? 'Target Prefix / Topic' : 'Destination Table'}</label>
              <input id={`${id}-target-${idx}`} className="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-slate-50 focus:bg-white" value={pair.targetEntity} onChange={(e) => updatePair(idx, 'targetEntity', e.target.value)} placeholder={isStreamOrLake ? 'e.g., entity_parquet/ or topic' : 'e.g., destination_table'} />
            </div>
            {pairs.length > 1 && (
              <button type="button" id={`${id}-delete-${idx}`} onClick={() => removePair(idx)} className="mt-4 p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-all" title="Remove entity">
                <i className="fa-regular fa-trash-can text-xs" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WizardStepEntities;
