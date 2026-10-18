import React from 'react';

const SELECT_CLS = 'w-full max-w-[320px] px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';
const INPUT_CLS = 'w-full max-w-[320px] px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';

export const WizardStepEntitiesRow = ({
  id,
  idx,
  pair,
  onUpdate,
  onRemove,
  canRemove,
  isSourceDb,
  isSourceCdc,
  isTargetDb,
  sourceTables = [],
  targetTables = [],
  onOpenDdl,
}) => {
  const hasDdl = !!pair.sourceSchemaSql?.trim();

  return (
    <div id={`${id}-row-${idx}`} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-xs">
      <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">#{idx + 1}</span>

      {/* Source Column */}
      <div className="flex-1">
        {isSourceDb ? (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Source Database Table *</label>
            <select id={`${id}-source-${idx}`} className={SELECT_CLS} value={pair.sourceEntity || ''} onChange={(e) => onUpdate(idx, 'sourceEntity', e.target.value)}>
              <option value="">Select source table...</option>
              {sourceTables.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        ) : isSourceCdc ? (
          <div>
            <div className="flex items-center justify-between mb-1 max-w-[320px]">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CDC Table Entity *</label>
              <button type="button" onClick={() => onOpenDdl(idx)} className={`text-[11px] font-semibold flex items-center gap-1 ${hasDdl ? 'text-indigo-600 hover:text-indigo-800' : 'text-amber-600 hover:text-amber-800'}`}>
                <i className="fa-solid fa-code text-[10px]" /><span>{hasDdl ? 'DDL Defined' : 'Set DDL +'}</span>
              </button>
            </div>
            <input id={`${id}-source-${idx}`} className={INPUT_CLS} value={pair.sourceEntity || ''} onChange={(e) => onUpdate(idx, 'sourceEntity', e.target.value)} placeholder="e.g., SCHEMA.TABLE" />
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Source Table Discovery</label>
            <div className="w-full max-w-[320px] px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-between">
              <span>Feature not available</span><i className="fa-solid fa-circle-exclamation text-slate-300" />
            </div>
          </div>
        )}
      </div>

      <i className="fa-solid fa-arrow-right text-slate-400 text-xs mt-4" />

      {/* Target Column */}
      <div className="flex-1">
        {isTargetDb ? (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Destination Table *</label>
            <select id={`${id}-target-${idx}`} className={SELECT_CLS} value={pair.targetEntity || ''} onChange={(e) => onUpdate(idx, 'targetEntity', e.target.value)}>
              <option value="">Select target table...</option>
              {targetTables.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Target Table Discovery</label>
            <div className="w-full max-w-[320px] px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-between">
              <span>Feature not available</span><i className="fa-solid fa-circle-exclamation text-slate-300" />
            </div>
          </div>
        )}
      </div>

      {canRemove && (
        <button type="button" id={`${id}-delete-${idx}`} onClick={() => onRemove(idx)} className="mt-4 p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-all" title="Remove entity">
          <i className="fa-regular fa-trash-can text-xs" />
        </button>
      )}
    </div>
  );
};

export default WizardStepEntitiesRow;
