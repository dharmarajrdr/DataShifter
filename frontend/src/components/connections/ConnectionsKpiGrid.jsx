import React from 'react';

export const ConnectionsKpiGrid = ({ connections = [], id = 'conn-kpi' }) => {
  const total = connections.length;
  const connected = connections.filter((c) => c.status === 'CONNECTED').length;
  const failed = connections.filter((c) => c.status === 'FAILED').length;

  const kpis = [
    {
      id: `${id}-total`,
      label: 'Configured Drivers',
      value: total,
      color: 'text-slate-900',
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      icon: (
        <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
    },
    {
      id: `${id}-connected`,
      label: 'Healthy & Active',
      value: connected,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      icon: (
        <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      id: `${id}-latency`,
      label: 'Avg Query Latency',
      value: '12ms',
      color: 'text-sky-600',
      bg: 'bg-sky-50 text-sky-600 border-sky-100',
      icon: (
        <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      ),
    },
    {
      id: `${id}-failed`,
      label: 'Degraded / Auth Error',
      value: failed,
      color: failed > 0 ? 'text-rose-600' : 'text-slate-400',
      bg: failed > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-200',
      icon: (
        <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <div id={id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          id={kpi.id}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between"
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {kpi.label}
            </div>
            <div className={`text-2xl font-bold mt-1 leading-none ${kpi.color}`}>
              {kpi.value}
            </div>
          </div>
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${kpi.bg}`}>
            {kpi.icon}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConnectionsKpiGrid;
