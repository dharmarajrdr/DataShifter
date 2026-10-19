import React from 'react';
import { Link } from 'react-router-dom';

const SAFEGUARDS = [
  {
    icon: 'fa-solid fa-circle-check',
    title: 'Schema Conformance',
    desc: 'Type coercion, primary keys, and nullable checks are actively enforced without drops.',
  },
  {
    icon: 'fa-solid fa-bolt',
    title: 'Live CDC Health',
    desc: 'Replication slot latency is within safe thresholds (< 200ms) with zero dropped records.',
  },
  {
    icon: 'fa-solid fa-shield-halved',
    title: 'Automated Protection',
    desc: 'Dead letter queues and automatic retry policies are armed in case anomalous rows occur.',
  },
];

export const ErrorZeroState = ({ pipelineId }) => {
  return (
    <div className="space-y-4">
      {/* Hero Health Card */}
      <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs flex flex-col items-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>All Systems Healthy &amp; Operational</span>
        </div>

        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1.5">Zero Errors Recorded</h2>
        <p className="text-xs text-slate-500 max-w-lg leading-relaxed mb-6">
          This pipeline is executing cleanly with 100% data fidelity. Every batch and stream record has been validated against your column mappings and target constraints without incident.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link to={`/pipelines/${pipelineId}/monitor`} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors">
            <i className="fa-solid fa-chart-line text-[11px]" />
            <span>View Live Throughput &amp; Metrics</span>
          </Link>
          <Link to="/notifyhub/channels" className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors">
            <i className="fa-solid fa-bell text-[11px]" />
            <span>Set Failure Alert Channels</span>
          </Link>
          <Link to={`/pipelines/${pipelineId}/settings`} className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors">
            <i className="fa-solid fa-gear text-[11px]" />
            <span>Pipeline Settings</span>
          </Link>
        </div>
      </div>

      {/* Diagnostics Safeguards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SAFEGUARDS.map((s) => (
          <div key={s.title} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <i className={`${s.icon} text-sm`} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-0.5">{s.title}</h4>
              <p className="text-[11px] text-slate-500 leading-snug">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ErrorZeroState;
