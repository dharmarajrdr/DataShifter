import React from 'react';
import { Button } from '../common';

const STATUS_CONFIG = {
  PENDING_CONFIRMATION: { label: 'Awaiting Confirmation', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Approved', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  EXECUTING: { label: 'Executing...', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  COMPLETED: { label: 'Executed Successfully', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Cancelled', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  FAILED: { label: 'Execution Failed', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const BeetelPlanCard = ({ plan, onConfirm, onReject, isBusy = false }) => {
  if (!plan) return null;
  const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.PENDING_CONFIRMATION;

  return (
    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-800">{plan.title || 'Beetel Execution Plan'}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.badge}`}>{cfg.label}</span>
      </div>

      {plan.summary && <p className="text-xs text-slate-700 leading-relaxed">{plan.summary}</p>}

      {Array.isArray(plan.steps) && plan.steps.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Steps ({plan.steps.length}):</span>
          {plan.steps.map((st, i) => (
            <div key={i} className="flex items-start gap-2 bg-white border border-slate-200 rounded-lg p-2 text-xs">
              <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-800 truncate">{st.title}</div>
                {st.description && <div className="text-[11px] text-slate-500 mt-0.5">{st.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {plan.executionResult && <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 font-medium">{plan.executionResult}</div>}
      {plan.errorMessage && <div className="p-2 rounded bg-rose-50 text-rose-800 text-xs border border-rose-200">{plan.errorMessage}</div>}

      {plan.status === 'PENDING_CONFIRMATION' && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" size="sm" disabled={isBusy} onClick={() => onReject(plan.id)}>Reject</Button>
          <Button variant="primary" size="sm" disabled={isBusy} onClick={() => onConfirm(plan.id)}>
            {isBusy ? 'Executing...' : 'Approve & Execute Plan'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BeetelPlanCard;

