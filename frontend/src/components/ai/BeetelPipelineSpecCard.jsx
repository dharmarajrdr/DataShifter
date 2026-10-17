import React from 'react';

export const BeetelPipelineSpecCard = ({ spec, onApply }) => {
  if (!spec) return null;

  return (
    <div className="mt-3">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Synthesized Pipeline Spec
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {spec.validation || 'Validation: 100% Passed'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
            <div className="text-[10px] text-slate-500">Source Driver</div>
            <div className="font-bold text-xs text-slate-900 mt-0.5 truncate">
              {spec.source || 'PostgreSQL WAL2JSON'}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
            <div className="text-[10px] text-slate-500">Transform Stage</div>
            <div className="font-bold text-xs text-indigo-600 mt-0.5 truncate">
              {spec.transform || 'CDC Event Flattener'}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
            <div className="text-[10px] text-slate-500">Destination</div>
            <div className="font-bold text-xs text-slate-900 mt-0.5 truncate">
              {spec.dest || 'Snowflake Internal Stage'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onApply}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <svg className="w-3.5 h-3.5 stroke-current fill-none inline" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Apply & Create Pipeline
        </button>
      </div>
    </div>
  );
};

export default BeetelPipelineSpecCard;
