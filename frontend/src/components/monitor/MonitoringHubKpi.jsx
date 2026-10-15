import React from 'react';
import { Activity, Radio, Zap, AlertTriangle } from 'lucide-react';

/**
 * KPI summary metrics for central monitoring hub (<= 100 lines).
 */
export const MonitoringHubKpi = ({ id = 'monitoring-kpi-grid', pipelines = [] }) => {
  const total = pipelines.length;
  const running = pipelines.filter((p) => p.status === 'RUNNING').length;
  const cdcCount = pipelines.filter((p) => p.mode === 'CDC' || p.isCdc).length;
  const failed = pipelines.filter((p) => p.status === 'FAILED' || (p.errorsCount || 0) > 0).length;

  const kpis = [
    {
      id: 'kpi-total',
      label: 'Total Monitored',
      value: total,
      sub: `${running} active now`,
      icon: Activity,
      color: 'text-brand-600',
      bg: 'bg-brand-50 border-brand-100',
    },
    {
      id: 'kpi-live-streams',
      label: 'Live Streams',
      value: running,
      sub: 'Real-time telemetry',
      icon: Radio,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      id: 'kpi-cdc',
      label: 'CDC Pipelines',
      value: cdcCount,
      sub: 'WAL / SCN replication',
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      id: 'kpi-alerts',
      label: 'Error Alerts',
      value: failed,
      sub: failed > 0 ? 'Requires attention' : 'Healthy stream state',
      icon: AlertTriangle,
      color: failed > 0 ? 'text-rose-600' : 'text-slate-500',
      bg: failed > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100',
    },
  ];

  return (
    <div id={id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div
            key={k.id}
            id={`${id}-${k.id}`}
            className="ds-kpi-card bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between"
          >
            <div id={`${id}-${k.id}-info`}>
              <p id={`${id}-${k.id}-label`} className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {k.label}
              </p>
              <h3 id={`${id}-${k.id}-value`} className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {k.value}
              </h3>
              <p id={`${id}-${k.id}-sub`} className="text-xs text-slate-500 mt-0.5">
                {k.sub}
              </p>
            </div>
            <div
              id={`${id}-${k.id}-icon-wrap`}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${k.bg}`}
            >
              <Icon id={`${id}-${k.id}-icon`} className={`w-5 h-5 ${k.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MonitoringHubKpi;
