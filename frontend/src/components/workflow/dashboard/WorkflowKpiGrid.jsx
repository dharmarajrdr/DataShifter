import React from 'react';

export const WorkflowKpiGrid = ({
  id = 'workflow-kpi-grid',
  className = '',
  counts = { total: 0, ready: 0, running: 0, failed: 0 },
}) => {
  const cards = [
    {
      id: `${id}-total`,
      label: 'Total Workflows',
      value: counts.total,
      icon: 'fa-solid fa-diagram-project',
      colorCls: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      id: `${id}-ready`,
      label: 'Ready (Valid DAG)',
      value: counts.ready,
      icon: 'fa-solid fa-circle-check',
      colorCls: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      id: `${id}-running`,
      label: 'Running Execution',
      value: counts.running,
      icon: 'fa-solid fa-play',
      colorCls: 'bg-sky-50 text-sky-600 border-sky-100',
    },
    {
      id: `${id}-failed`,
      label: 'Failed / Halted',
      value: counts.failed,
      icon: 'fa-solid fa-triangle-exclamation',
      colorCls: 'bg-rose-50 text-rose-600 border-rose-100',
    },
  ];

  return (
    <div
      id={id}
      className={`ds-workflow-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0 ${className}`}
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

export default WorkflowKpiGrid;
