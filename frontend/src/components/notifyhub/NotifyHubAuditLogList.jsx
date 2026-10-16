import React from 'react';

const SAMPLE_LOGS = [
  { id: 'log-1', event: 'PIPELINE_ERRORED', color: 'text-rose-600', resource: 'mysql_customer_cdc_sync', channel: '#data-pipeline-alerts (Slack)', status: '200 OK', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', time: '10:42:15 AM' },
  { id: 'log-2', event: 'LATENCY_SLA_BREACH', color: 'text-amber-600', resource: 'events_kafka_stream', channel: 'Tier-1 On-Call (PagerDuty)', status: '202 ACCEPTED', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', time: '10:35:02 AM' },
  { id: 'log-3', event: 'WORKFLOW_COMPLETED', color: 'text-emerald-600', resource: 'nightly_reconciliation_flow', channel: 'Datadog Ingestion (Webhook)', status: '200 OK', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', time: '09:12:44 AM' },
  { id: 'log-4', event: 'PIPELINE_STARTED', color: 'text-sky-600', resource: 'oracle_dw_nightly_batch', channel: 'Daily Operations (Email)', status: '200 OK', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', time: '08:00:10 AM' },
];

export const NotifyHubAuditLogList = ({ logs = SAMPLE_LOGS, onClearLogs, id = 'notify-audit-log' }) => {
  return (
    <div id={id} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Notification Dispatches</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{logs.length} logged</span>
        </div>
        {onClearLogs && (
          <button type="button" onClick={onClearLogs} className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
            Clear Log History
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Trigger Event</th>
              <th className="px-4 py-3">Pipeline / Workflow</th>
              <th className="px-4 py-3">Channel Target</th>
              <th className="px-4 py-3">HTTP Response</th>
              <th className="px-4 py-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className={`px-4 py-3 font-bold font-mono text-[11px] ${log.color}`}>{log.event}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{log.resource}</td>
                <td className="px-4 py-3 text-slate-600">{log.channel}</td>
                <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${log.badge}`}>{log.status}</span></td>
                <td className="px-4 py-3 text-right font-mono text-slate-400 text-[11px]">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotifyHubAuditLogList;
