import React from 'react';

export const PipelineKpiGrid = ({
  id = 'pipeline-kpi-grid',
  className = '',
  counts = { total: 0, running: 0, errored: 0, completed: 0 },
}) => {
  const cards = [
    {
      id: `${id}-total`,
      label: 'Total Pipelines',
      value: counts.total,
      icon: 'fa-solid fa-layer-group',
      colorCls: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      id: `${id}-running`,
      label: 'Active & Streaming',
      value: counts.running,
      icon: 'fa-solid fa-bolt',
      colorCls: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      id: `${id}-completed`,
      label: 'Completed Runs',
      value: counts.completed,
      icon: 'fa-solid fa-circle-check',
      colorCls: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      id: `${id}-errored`,
      label: 'Paused / Errored',
      value: counts.errored,
      icon: 'fa-solid fa-triangle-exclamation',
      colorCls: 'bg-rose-50 text-rose-600 border-rose-100',
    },
  ];

  return (
    <div
      id={id}
      className={`ds-pipeline-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0 ${className}`}
    >
      {cards.map((c) => (
        <div
          key={c.id}
          id={c.id}
          className="ds-kpi-card bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs flex items-center justify-between"
        >
          <div id={`${c.id}-meta`} className="ds-kpi-meta flex flex-col gap-0.5">
            <span
              id={`${c.id}-label`}
              className="ds-kpi-label text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
            >
              {c.label}
            </span>
            <span
              id={`${c.id}-val`}
              className="ds-kpi-val text-2xl font-bold text-slate-900 leading-tight"
            >
              {c.value}
            </span>
          </div>
          <div
            id={`${c.id}-icon-box`}
            className={`ds-kpi-icon-box w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${c.colorCls}`}
          >
            <i id={`${c.id}-icon`} className={`${c.icon} text-sm`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PipelineKpiGrid;
