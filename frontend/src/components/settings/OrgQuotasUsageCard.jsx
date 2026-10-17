import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';

export const OrgQuotasUsageCard = ({ id = 'org-quotas' }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuotas = () => {
    let active = true;
    setLoading(true);
    setError(null);
    if (typeof authApi?.getOrgQuotas === 'function') {
      authApi.getOrgQuotas()
        .then((res) => {
          if (active && res?.data) {
            setData({
              planName: res.data.planName || 'Enterprise',
              quotas: Array.isArray(res.data.quotas) ? res.data.quotas : [],
            });
          }
        })
        .catch((err) => { if (active) setError(err?.message || 'Failed to load quotas'); })
        .finally(() => { if (active) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { active = false; };
  };

  useEffect(() => fetchQuotas(), []);

  return (
    <div id={id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Plan Usage & Quotas</h3>
        {loading ? <span className="w-16 h-4 bg-slate-100 rounded-full animate-pulse" /> : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
            {data?.planName || 'Enterprise'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 py-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-1.5 animate-pulse">
              <div className="flex justify-between">
                <div className="w-24 h-3 bg-slate-100 rounded" />
                <div className="w-12 h-3 bg-slate-100 rounded" />
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-3 text-center">
          <p className="text-xs text-rose-500 mb-2">{error}</p>
          <button type="button" onClick={fetchQuotas} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {(data?.quotas || []).map((item, idx) => (
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
      )}

      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Need increased limits?</span>
        <button
          type="button"
          onClick={() => navigate('/settings/billing')}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
        >
          Upgrade Quotas →
        </button>
      </div>
    </div>
  );
};

export default OrgQuotasUsageCard;
