import React from 'react';

export const ConnectionsKpiGrid = ({ connections = [], id = 'conn-kpi' }) => {
  const total = connections.length;
  const connected = connections.filter(c => c.status === 'CONNECTED').length;
  const failed = connections.filter(c => c.status === 'FAILED').length;

  const kpis = [
    {
      id: `${id}-total`,
      label: 'Configured Drivers',
      value: total,
      color: 'text-slate-900',
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      icon: 'fa-solid fa-database',
    },
    {
      id: `${id}-connected`,
      label: 'Healthy & Active',
      value: connected,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      icon: 'fa-solid fa-circle-check',
    },
    {
      id: `${id}-latency`,
      label: 'Avg Query Latency',
      value: '14ms',
      color: 'text-sky-600',
      bg: 'bg-sky-50 text-sky-600 border-sky-200',
      icon: 'fa-solid fa-bolt',
    },
    {
      id: `${id}-failed`,
      label: 'Degraded / Error',
      value: failed,
      color: failed > 0 ? 'text-rose-600' : 'text-slate-400',
      bg: failed > 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-400 border-slate-200',
      icon: 'fa-solid fa-triangle-exclamation',
    },
  ];

  return (
    <div id={id} className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          id={kpi.id}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              {kpi.label}
            </span>
            <span className={`text-xl font-bold mt-0.5 block ${kpi.color}`}>
              {kpi.value}
            </span>
          </div>
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-sm ${kpi.bg}`}>
            <i className={kpi.icon} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConnectionsKpiGrid;
