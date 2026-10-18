import React from 'react';
import { Button } from '../common';
import { STATUS_BADGE } from './aiKeyConstants';

export const formatErrorMessage = (err) => {
  if (!err) return '';
  try {
    const jsonMatch = String(err).match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        const prefix = err.match(/^(\d+\s*-\s*)/)?.[1] || '';
        return `${prefix}${parsed.error.message}`;
      }
    }
  } catch { /* use raw text */ }
  return String(err);
};

export const AiKeyCard = ({
  keyItem: k, index: idx, canEdit, isTesting,
  onTest, onReset, onToggleActive, onDelete,
}) => {
  const badge = STATUS_BADGE[k.status] || STATUS_BADGE.ACTIVE;

  return (
    <div className={`p-3.5 border rounded-xl cursor-pointer transition-all duration-200 ease-in-out hover:border-indigo-400 hover:shadow-md ${k.isActive ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-75'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">#{idx + 1}</span>
            <span className="text-sm font-bold text-slate-900">{k.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${k.provider === 'GROQ' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
              {k.provider}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.badgeCls || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {badge.label}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            {k.provider === 'GROQ' ? k.maskedKey : k.baseUrl} · Model: {k.modelName}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant="secondary" disabled={isTesting} onClick={() => onTest(k.id)}>
              {isTesting ? 'Testing...' : 'Test'}
            </Button>
            {k.status !== 'ACTIVE' && (
              <Button type="button" size="sm" variant="secondary" onClick={() => onReset(k.id)}>
                Reset
              </Button>
            )}
            <Button type="button" size="sm" variant="secondary" onClick={() => onToggleActive(k)}>
              {k.isActive ? 'Disable' : 'Enable'}
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={() => onDelete(k.id)}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {k.lastError && k.status !== 'ACTIVE' && (
        <div className="mt-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5 text-xs shadow-xs">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="font-bold text-rose-950 flex items-center gap-1.5">
              <span>Last Error</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-200/70 text-rose-900">
                Cooldown Active
              </span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed font-mono break-words">
              {formatErrorMessage(k.lastError)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiKeyCard;

