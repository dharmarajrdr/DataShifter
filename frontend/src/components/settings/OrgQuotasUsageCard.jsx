import React, { useState, useEffect } from 'react';
import { authApi } from '../../services/authApi';

const DEFAULT_QUOTAS = [
  { label: 'Pipelines Used', current: '0', max: '50', pct: 0, color: 'bg-indigo-600' },
  { label: 'Active Connections', current: '0', max: '25', pct: 0, color: 'bg-indigo-600' },
  { label: 'Monthly Rows Migrated', current: '0', max: '100M', pct: 0, color: 'bg-emerald-600' },
];

export const OrgQuotasUsageCard = ({ id = 'org-quotas' }) => {
  const [data, setData] = useState({ planName: 'Enterprise', quotas: DEFAULT_QUOTAS });

  useEffect(() => {
    let active = true;
    if (typeof authApi?.getOrgQuotas === 'function') {
      authApi.getOrgQuotas()
        .then((res) => {
          if (active && res?.data) {
            setData({
              planName: res.data.planName || 'Enterprise',
              quotas: Array.isArray(res.data.quotas) && res.data.quotas.length > 0
                ? res.data.quotas
                : DEFAULT_QUOTAS,
            });
          }
        })
        .catch(() => {});
    }
    return () => { active = false; };
  }, []);

  return (
    <div id={id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          Plan Usage & Quotas
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
          {data.planName}
        </span>
      </div>

      <div className="space-y-3.5">
        {data.quotas.map((item, idx) => (
          <div key={item.key || idx}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <span className="font-semibold text-slate-800">{item.current} / {item.max}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${item.color || 'bg-indigo-600'}`}
                style={{ width: `${Math.min(100, Math.max(0, item.pct || 0))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Need increased limits?</span>
        <button type="button" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
          Upgrade Quotas →
        </button>
      </div>
    </div>
  );
};

export default OrgQuotasUsageCard;
