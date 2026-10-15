import { useState } from 'react';
import UdfPickerModal from '../UdfPickerModal';
import { SYSTEM_VALUES } from './DragBoardConstants';

/**
 * Target Column Configuration Modal (<= 100 lines).
 */
export const TargetConfigModal = ({
  id = 'target-config-modal', colName, sourceTables, onSelectSystem, onSelectUdf, onClose,
}) => {
  const [mode] = useState('system');
  const [selectedFn, setSelectedFn] = useState(null);
  const [args, setArgs] = useState('');

  if (mode === 'udf') {
    return (
      <UdfPickerModal id={`${id}-udf`} targetColumn={colName} sourceTables={sourceTables} onApply={(cfg, pCol) => onSelectUdf(cfg, pCol)} onClose={onClose} />
    );
  }

  const handleApply = () => {
    if (!selectedFn) return;
    onSelectSystem(selectedFn, args);
    onClose();
  };

  const selected = SYSTEM_VALUES.find((s) => s.fn === selectedFn);

  return (
    <>
      <div id={`${id}-backdrop`} className="fixed inset-0 z-50 bg-black/20" onClick={onClose} />
      <div id={id} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden">
        <div id={`${id}-header`} className="p-4 pb-2 border-b border-slate-200 bg-slate-50">
          <div className="text-sm font-semibold text-slate-900">Target Column Configuration</div>
          <div className="text-xs text-slate-500 mt-0.5 mb-2">
            Configure generation for <span className="text-indigo-600 font-semibold">{colName}</span>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 py-1.5 px-3 border-b-2 border-indigo-600 text-indigo-700 font-semibold text-xs flex items-center">
              <i className="fa-solid fa-gear mr-1.5" /> System Value
            </span>
          </div>
        </div>

        <div id={`${id}-list`} className="p-2 max-h-80 overflow-y-auto space-y-1">
          {SYSTEM_VALUES.map((sv) => {
            const isSel = selectedFn === sv.fn;
            return (
              <div
                key={sv.fn}
                id={`${id}-opt-${sv.fn}`}
                onClick={() => { setSelectedFn(sv.fn); setArgs(''); }}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  isSel ? 'bg-indigo-50 border border-indigo-600' : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span className={`text-sm mt-0.5 w-4 text-center ${isSel ? 'text-indigo-600' : 'text-slate-500'}`}><i className={sv.icon} /></span>
                <div>
                  <div className="text-xs font-medium text-slate-900">{sv.label}</div>
                  <div className="text-[11px] text-slate-500">{sv.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {selected?.needsArgs && (
          <div id={`${id}-args-group`} className="px-4 pb-3">
            <input id={`${id}-args-input`} value={args} onChange={(e) => setArgs(e.target.value)} placeholder={selected.argHint || 'Enter value'} autoFocus className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
        )}

        <div id={`${id}-footer`} className="p-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
          <button id={`${id}-cancel-btn`} onClick={onClose} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-100">Cancel</button>
          <button id={`${id}-apply-btn`} onClick={handleApply} disabled={!selectedFn || (selected?.needsArgs && !args.trim())} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium disabled:opacity-50 hover:bg-indigo-700">Apply</button>
        </div>
      </div>
    </>
  );
};

export default TargetConfigModal;
