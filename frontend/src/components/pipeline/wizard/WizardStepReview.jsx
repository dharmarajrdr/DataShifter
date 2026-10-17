import React from 'react';

/**
 * Step 5: Architectural Summary & Sequential Review (<= 100 lines).
 */
export const WizardStepReview = ({
  id = 'wizard-step-review',
  config,
  namespaces = [],
}) => {
  const ns = namespaces.find((n) => n.id === config.namespaceId)?.name || 'Default';
  const pairs = config.entityPairs || [
    { sourceEntity: 'HR.CUSTOMERS', targetEntity: 'customers_parquet/' },
    { sourceEntity: 'SALES.ORDERS', targetEntity: 'orders_parquet/' },
  ];

  return (
    <div id={id} className="wizard-step-review-panel w-full py-2">
      <div id={`${id}-header`} className="mb-4">
        <h3 id={`${id}-title`} className="text-base font-semibold text-slate-900">
          Review Pipeline Architecture
        </h3>
        <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">
          Verify configuration before provisioning the pipeline and opening the Column Mapping Board.
        </p>
      </div>

      <div id={`${id}-grid`} className="grid grid-cols-2 gap-3 mb-3">
        {/* Box 1: Basics */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-2">
            <i className="fa-solid fa-circle-info text-indigo-600" /> Pipeline Basics
          </div>
          <div className="flex justify-between"><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900">{config.name || 'Untitled'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Namespace:</span> <span className="font-medium text-indigo-600">{ns}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Description:</span> <span className="text-slate-600 truncate max-w-[140px]">{config.description || 'None'}</span></div>
        </div>

        {/* Box 2: Source Adapter */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-2">
            <i className="fa-solid fa-server text-rose-600" /> Source Adapter
          </div>
          <div className="flex justify-between"><span className="text-slate-500">Type:</span> <span className="font-medium text-slate-900">{config.sourceAdapter || 'oracle-trail'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Path:</span> <span className="font-mono text-[11px] text-slate-700">{config.cdcDirectoryPath || 'Standard'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Pattern:</span> <span className="font-mono text-[11px] text-slate-700">{config.cdcFilePattern || 'aa.*'}</span></div>
        </div>

        {/* Box 3: Target Destination */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-2">
            <i className="fa-solid fa-cloud text-amber-600" /> Target Destination
          </div>
          <div className="flex justify-between"><span className="text-slate-500">Type:</span> <span className="font-medium text-slate-900">{config.targetAdapter || 's3-writer'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Location:</span> <span className="font-mono text-[11px] text-slate-700">{config.s3Bucket || config.kafkaTopic || 'Standard'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Region:</span> <span className="text-slate-700">{config.s3Region || 'us-east-1'}</span></div>
        </div>

        {/* Box 4: Execution Plan */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-2">
            <i className="fa-solid fa-list-ol text-emerald-600" /> Execution Plan
          </div>
          {pairs.map((p, i) => (
            <div key={i} className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-500">#{i + 1} {p.sourceEntity}</span>
              <span className="text-indigo-600">&rarr; {p.targetEntity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WizardStepReview;
