import React, { useState } from 'react';
import PipelineCard from './PipelineCard';

export const PipelineNamespaceGroup = ({
  id,
  namespace,
  pipelines = [],
  navigate,
  onDragStart,
  onDropPipeline,
  dragOverNs,
  setDragOverNs,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const groupId = id || `pipeline-ns-group-${namespace?.id}`;
  const isDropTarget = dragOverNs === namespace?.id;

  const handleDrop = (e) => {
    e.preventDefault();
    const pid = e.dataTransfer.getData('text/plain');
    if (pid) onDropPipeline(pid, namespace.id, namespace.name);
    setDragOverNs(null);
  };

  return (
    <div
      id={groupId}
      className="ds-pipeline-ns-group mb-5"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverNs(namespace.id); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverNs(null); }}
      onDrop={handleDrop}
    >
      <div
        id={`${groupId}-header`}
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-all mb-2 ${
          isDropTarget ? 'border-2 border-dashed border-indigo-500 bg-indigo-50/50' : 'hover:bg-slate-100/60'
        }`}
      >
        <div id={`${groupId}-meta`} className="flex items-center gap-2">
          <i
            id={`${groupId}-chevron`}
            className={`fa-solid text-xs text-slate-400 w-3.5 ${collapsed ? 'fa-chevron-right' : 'fa-chevron-down'}`}
          />
          <span
            id={`${groupId}-dot`}
            className="w-2.5 h-2.5 rounded-xs shrink-0"
            style={{ backgroundColor: namespace.color || '#6366F1' }}
          />
          <span id={`${groupId}-name`} className="text-sm font-semibold text-slate-800">{namespace.name}</span>
          <span id={`${groupId}-count`} className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {pipelines.length}
          </span>
        </div>
        {isDropTarget && (
          <span id={`${groupId}-drop-hint`} className="text-xs font-semibold text-indigo-600">Drop here</span>
        )}
      </div>

      {!collapsed && (
        <div id={`${groupId}-body`} className="pl-6 min-h-[40px]">
          {pipelines.length === 0 && isDropTarget ? (
            <div id={`${groupId}-drop-zone`} className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
              Drop pipeline here
            </div>
          ) : (
            <div id={`${groupId}-grid`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pipelines.map((p) => (
                <PipelineCard
                  key={p.id}
                  id={`${groupId}-card-${p.id}`}
                  pipeline={p}
                  navigate={navigate}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PipelineNamespaceGroup;
