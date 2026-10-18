import React from 'react';
import PipelineNamespaceGroup from './PipelineNamespaceGroup';

export const PipelineGridBody = ({
  id = 'pipeline-grid-body',
  className = '',
  filteredPipelines = [],
  groupedPipelines = [],
  draggingPipelineId,
  search,
  selectedNamespaces = [],
  navigate,
  onDragStart,
  onDropPipeline,
  dragOverNs,
  setDragOverNs,
}) => {
  if (filteredPipelines.length === 0 && !draggingPipelineId) {
    return (
      <div
        id={`${id}-empty`}
        className={`ds-pipeline-empty p-10 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white/50 ${className}`}
      >
        <i
          id={`${id}-empty-icon`}
          className="fa-solid fa-filter-circle-xmark text-2xl mb-2 text-slate-300 block"
        />
        <p id={`${id}-empty-text`} className="text-sm font-medium">
          {search || selectedNamespaces.length > 0
            ? 'No pipelines match your search or filter criteria'
            : 'No pipelines yet. Create your first pipeline to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div id={id} className={`ds-pipeline-grid-body space-y-4 ${className}`}>
      {groupedPipelines.map((g) => (
        <PipelineNamespaceGroup
          key={g.namespace.id}
          id={`${id}-ns-${g.namespace.id}`}
          namespace={g.namespace}
          pipelines={g.pipelines}
          navigate={navigate}
          onDragStart={onDragStart}
          onDropPipeline={onDropPipeline}
          dragOverNs={dragOverNs}
          setDragOverNs={setDragOverNs}
        />
      ))}
    </div>
  );
};

export default PipelineGridBody;
