import React from 'react';
import { StatusBadge } from '../../common';

export const WorkflowTableRow = ({ id, workflow, navigate }) => {
  const rowId = id || `workflow-row-${workflow?.id}`;
  const progressVal = workflow?.overallProgress ?? workflow?.progress ?? 0;
  const ownerName = workflow?.ownerName || 'User';
  const ownerInitials = workflow?.ownerInitials || ownerName.slice(0, 2).toUpperCase();
  const stepCount = workflow?.pipelineCount || 0;
  const names = workflow?.orderedPipelineNames || [];

  return (
    <tr
      id={rowId}
      onClick={() => navigate(`/workflows/${workflow.id}/monitor`)}
      className="ds-table-row border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
    >
      <td id={`${rowId}-cell-name`} className="px-4 py-3 text-left">
        <div id={`${rowId}-title`} className="font-semibold text-slate-900 text-sm">{workflow.name}</div>
        <div id={`${rowId}-sub`} className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
          <span className="font-medium text-indigo-600">{workflow.namespaceName || 'Default'}</span>
          <span>•</span>
          <span>{stepCount} {stepCount === 1 ? 'pipeline' : 'pipelines'}</span>
        </div>
      </td>
      <td id={`${rowId}-cell-pipelines`} className="px-4 py-3 text-left">
        {names.length > 0 ? (
          <div className="inline-flex items-center gap-1.5 flex-wrap">
            {names.slice(0, 3).map((n, i) => (
              <React.Fragment key={i}>
                {i > 0 && <i className="fa-solid fa-arrow-right text-[10px] text-slate-400" />}
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[120px]">{n}</span>
              </React.Fragment>
            ))}
            {names.length > 3 && <span className="text-[10px] text-slate-400 font-medium">+{names.length - 3} more</span>}
          </div>
        ) : (
          <span className="text-xs text-slate-400">No member pipelines</span>
        )}
      </td>
      <td id={`${rowId}-cell-status`} className="py-3 text-left whitespace-nowrap">
        <StatusBadge id={`${rowId}-status`} status={workflow.status} />
      </td>
      <td id={`${rowId}-cell-progress`} className="px-4 py-3 text-left">
        <div id={`${rowId}-prog-num`} className="font-semibold text-slate-800 text-xs">{Math.round(progressVal)}%</div>
        <div id={`${rowId}-prog-status`} className="text-[11px] text-slate-400">{workflow.status === 'RUNNING' ? 'Running' : 'Overall'}</div>
      </td>
      <td id={`${rowId}-cell-owner`} className="px-4 py-3 text-left whitespace-nowrap">
        <div id={`${rowId}-owner-wrap`} className="flex items-center gap-1.5">
          <span id={`${rowId}-owner-avatar`} className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">{ownerInitials}</span>
          <span id={`${rowId}-owner-name`} className="text-xs font-medium text-slate-700">{ownerName}</span>
        </div>
      </td>
    </tr>
  );
};

export const WorkflowTableView = ({ id = 'workflow-table-view', className = '', workflows = [], navigate }) => (
  <div id={id} className={`ds-workflow-table-container flex-1 h-full min-h-0 flex flex-col ${className}`}>
    <div id={`${id}-scroll-wrap`} className="ds-dashboard-table-wrap flex-1 h-full min-h-0 overflow-auto bg-white border border-slate-200 rounded-xl shadow-2xs">
      <table id={`${id}-table`} className="ds-dashboard-table min-w-[1080px] w-full border-collapse text-left text-xs">
        <thead id={`${id}-thead`} className="sticky top-0 z-20">
          <tr id={`${id}-header-row`} className="bg-slate-100/95 backdrop-blur-xs border-b-2 border-slate-200 shadow-2xs">
            <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[28%] whitespace-nowrap">Workflow & Namespace</th>
            <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[32%] whitespace-nowrap">Pipeline Chain</th>
            <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[14%] whitespace-nowrap">Status</th>
            <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[16%] whitespace-nowrap">Progress</th>
            <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[10%] whitespace-nowrap">Owner</th>
          </tr>
        </thead>
        <tbody id={`${id}-tbody`} className="divide-y divide-slate-100 bg-white">
          {workflows.length === 0 ? (
            <tr id={`${id}-empty-row`}>
              <td id={`${id}-empty-cell`} colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">No workflows found matching your filter criteria</td>
            </tr>
          ) : (
            workflows.map((w) => <WorkflowTableRow key={w.id} id={`${id}-row-${w.id}`} workflow={w} navigate={navigate} />)
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default WorkflowTableView;
