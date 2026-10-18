import React from 'react';
import { Card, Button } from '../common';

export const NotifyHubAuditLogList = ({ logs = [], onClearLogs, id = 'notify-audit-log' }) => {
  return (
    <Card id={id} variant="elevated" padding={false} className="w-full bg-white border border-slate-200 rounded-xl shadow-subtle overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Notification Dispatches</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {logs.length} logged
          </span>
        </div>
        {onClearLogs && logs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearLogs}>
            Clear History
          </Button>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Trigger Event</th>
              <th className="px-4 py-3">Pipeline / Workflow</th>
              <th className="px-4 py-3">Channel Target</th>
              <th className="px-4 py-3">Delivery Status</th>
              <th className="px-4 py-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-500">
                  <p className="font-semibold text-slate-700">No dispatches recorded yet</p>
                  <p className="text-xs mt-1 text-slate-400">Triggered notifications from channels and listeners will appear here in real time.</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className={`px-4 py-3 font-bold font-mono text-[11px] ${log.color || 'text-indigo-600'}`}>
                    {log.event || log.eventType}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{log.resource || log.pipelineName || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{log.channel || log.channelName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide ${
                      log.badge || (log.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200')
                    }`}>
                      {log.status || (log.success ? '200 OK' : 'FAILED')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400 text-[11px]">{log.time || log.timestamp || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default NotifyHubAuditLogList;
