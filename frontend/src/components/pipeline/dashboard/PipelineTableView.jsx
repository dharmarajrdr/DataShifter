import React from 'react';
import PipelineTableRow from './PipelineTableRow';

export const PipelineTableView = ({
  id = 'pipeline-table-view',
  className = '',
  pipelines = [],
  navigate,
}) => {
  return (
    <div
      id={id}
      className={`ds-pipeline-table-container flex-1 h-full min-h-0 flex flex-col ${className}`}
    >
      <div
        id={`${id}-scroll-wrap`}
        className="ds-dashboard-table-wrap flex-1 h-full min-h-0 overflow-auto bg-white border border-slate-200 rounded-xl shadow-2xs"
      >
        <table
          id={`${id}-table`}
          className="ds-dashboard-table min-w-[1080px] w-full border-collapse text-left text-xs"
        >
          <thead id={`${id}-thead`} className="sticky top-0 z-20">
            <tr id={`${id}-header-row`} className="bg-slate-100/95 backdrop-blur-xs border-b-2 border-slate-200 shadow-2xs">
              <th id={`${id}-th-name`} className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[28%]">
                Pipeline &amp; Namespace
              </th>
              <th id={`${id}-th-route`} className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[32%]">
                Route (Connectors)
              </th>
              <th id={`${id}-th-status`} className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[14%]">
                Status
              </th>
              <th id={`${id}-th-progress`} className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[16%]">
                Progress / Rate
              </th>
              <th id={`${id}-th-owner`} className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] w-[10%]">
                Owner
              </th>
            </tr>
          </thead>
          <tbody id={`${id}-tbody`} className="divide-y divide-slate-100 bg-white">
            {pipelines.length === 0 ? (
              <tr id={`${id}-empty-row`}>
                <td
                  id={`${id}-empty-cell`}
                  colSpan={5}
                  className="px-4 py-8 text-center text-slate-400 font-medium"
                >
                  No pipelines found matching your filter criteria
                </td>
              </tr>
            ) : (
              pipelines.map((p) => (
                <PipelineTableRow
                  key={p.id}
                  id={`${id}-row-${p.id}`}
                  pipeline={p}
                  navigate={navigate}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PipelineTableView;
