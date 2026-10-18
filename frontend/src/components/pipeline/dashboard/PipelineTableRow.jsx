import { StatusBadge } from '../../common';
import PipelineConnectorBadge from './PipelineConnectorBadge';

export const PipelineTableRow = ({
  id,
  pipeline,
  navigate,
}) => {
  const rowId = id || `pipeline-row-${pipeline?.id}`;
  const progressVal = pipeline?.progress >= 0 && pipeline?.progress <= 100 ? pipeline.progress : 0;
  const ownerName = pipeline?.ownerName || 'User';
  const ownerInitials = pipeline?.ownerInitials || ownerName.slice(0, 2).toUpperCase();

  return (
    <tr
      id={rowId}
      onClick={() => navigate(`/pipelines/${pipeline.id}/monitor`)}
      className="ds-table-row border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
    >
      <td id={`${rowId}-cell-name`} className="px-4 py-3 text-left">
        <div id={`${rowId}-title`} className="font-semibold text-slate-900 text-sm">
          {pipeline.name}
        </div>
        <div id={`${rowId}-sub`} className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
          <span className="font-medium text-indigo-600">{pipeline.namespaceName || 'Default'}</span>
          <span>•</span>
          <span>{pipeline.tableCount || 1} {pipeline.tableCount === 1 ? 'table' : 'tables'}</span>
        </div>
      </td>

      <td id={`${rowId}-cell-route`} className="px-4 py-3 text-left">
        <div id={`${rowId}-route-wrap`} className="inline-flex items-center gap-1.5 flex-wrap">
          <PipelineConnectorBadge id={`${rowId}-src`} name={pipeline.sourceName || pipeline.source || 'Source'} />
          <i className="fa-solid fa-arrow-right text-[10px] text-slate-400" />
          <PipelineConnectorBadge id={`${rowId}-tgt`} name={pipeline.targetName || pipeline.target || 'Target'} />
          {pipeline.workflowId && (
            <span
              id={`${rowId}-lock-tag`}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200"
              title={`Locked to workflow ${pipeline.workflowName || ''}`}
            >
              <i className="fa-solid fa-lock text-[8px] mr-1" />
              Locked
            </span>
          )}
        </div>
      </td>

      <td id={`${rowId}-cell-status`} className="py-3 text-left whitespace-nowrap">
        <StatusBadge id={`${rowId}-status`} status={pipeline.status} />
      </td>

      <td id={`${rowId}-cell-progress`} className="px-4 py-3 text-left">
        <div id={`${rowId}-prog-num`} className="font-semibold text-slate-800 text-xs">
          {Math.round(progressVal)}%
        </div>
        <div id={`${rowId}-prog-status`} className="text-[11px] text-slate-400">
          {pipeline.status === 'RUNNING' ? 'Streaming live' : 'Processed'}
        </div>
      </td>

      <td id={`${rowId}-cell-owner`} className="px-4 py-3 text-left whitespace-nowrap">
        <div id={`${rowId}-owner-wrap`} className="flex items-center gap-1.5">
          <span
            id={`${rowId}-owner-avatar`}
            className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0"
          >
            {ownerInitials}
          </span>
          <span id={`${rowId}-owner-name`} className="text-xs font-medium text-slate-700">
            {ownerName}
          </span>
        </div>
      </td>
    </tr>
  );
};

export default PipelineTableRow;
