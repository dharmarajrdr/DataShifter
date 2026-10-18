import React, { useState, useEffect } from 'react';
import { pipelineApi } from '../../services/api';

const STATUS_DOTS = { ERRORED: 'bg-rose-500', RUNNING: 'bg-emerald-500 animate-pulse' };

/** Single-row referenced pipelines collapsible drawer section (<= 100 lines) */
export const DrawerReferencedPipelines = ({ id = 'drawer-referenced-pipelines', adapter, pipelines: propPipelines }) => {
  const [fetched, setFetched] = useState([]);
  useEffect(() => {
    if (propPipelines || !adapter) return;
    pipelineApi.getAll().then((res) => {
      const list = res?.data || res;
      if (Array.isArray(list)) {
        const key = adapter.adapterKey || adapter.id;
        const matched = list.filter((p) => [p.sourceAdapterId, p.targetAdapterId].includes(key) || [p.sourceAdapterId, p.targetAdapterId].includes(adapter.id));
        setFetched(matched.map((p) => ({ ...p, slot: (p.sourceAdapterId === key || p.sourceAdapterId === adapter.id) ? 'Source' : 'Target' })));
      }
    }).catch(() => {});
  }, [adapter, propPipelines]);

  const list = propPipelines || fetched;
  if (!list || list.length === 0) return null;
  const visible = list.slice(0, 5);
  const remaining = list.length - visible.length;

  return (
    <details id={id} open className="group rounded-xl border border-slate-200 bg-white p-3.5 transition-colors open:border-slate-300">
      <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-900 select-none list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          <span>Referenced Pipelines</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">{list.length} {list.length === 1 ? 'Pipeline' : 'Pipelines'}</span>
        </div>
        <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">▼</span>
      </summary>

      <div className="mt-3 space-y-2.5">
        <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-center gap-2 text-[11px] text-amber-900">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <span>Cannot uninstall: Active in <strong className="font-semibold">{list.length} pipeline(s)</strong>.</span>
        </div>

        <div className="space-y-1.5">
          {visible.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOTS[p.status] || 'bg-sky-500'}`} />
                <a href={`/pipelines/${p.id}/monitor`} className="font-medium text-slate-800 hover:text-indigo-600 truncate" title={p.name}>{p.name}</a>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 uppercase shrink-0">{p.slot || 'Pipeline'}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${p.status === 'ERRORED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{p.status}</span>
                <a href={`/pipelines/${p.id}/monitor`} className="text-slate-400 hover:text-indigo-600 p-0.5" title="View Monitor">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>
            </div>
          ))}
        </div>

        {remaining > 0 && (
          <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full text-[11px]">+ {remaining} other pipelines</span>
            <a href="/pipelines" className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs flex items-center gap-1">
              <span>View all</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
        )}
      </div>
    </details>
  );
};

export default DrawerReferencedPipelines;
