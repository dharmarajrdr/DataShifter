import React from 'react';

const WorkflowCanvasToolbar = ({
  mode = 'builder',
  onAutoArrange,
  zoom = 1,
  onZoomChange,
  topologyInfo = { chainCount: 0, singleChainReady: false },
  nodeCount = 0,
}) => {
  const isReady = topologyInfo?.singleChainReady;
  const chainCount = topologyInfo?.chainCount || 0;

  return (
    <div
      id="workflow-canvas-toolbar"
      className="sticky top-3.5 left-4 z-20 flex items-center justify-between px-4 pointer-events-none"
    >
      <div
        id="workflow-canvas-controls"
        className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm pointer-events-auto"
      >
        {mode === 'builder' && onAutoArrange && (
          <>
            <button
              id="workflow-canvas-auto-align-btn"
              type="button"
              onClick={onAutoArrange}
              title="Auto-align workflow stages"
              className="border-none bg-transparent text-slate-600 hover:text-indigo-600 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-indigo-600" aria-hidden="true" />
              <span>Auto-Align</span>
            </button>
            <div className="w-px h-3.5 bg-slate-200" aria-hidden="true" />
          </>
        )}
        <button
          id="workflow-canvas-zoom-out-btn"
          type="button"
          onClick={() => onZoomChange?.(Math.max(0.7, +(zoom - 0.1).toFixed(2)))}
          className="border-none bg-transparent text-slate-600 hover:text-slate-900 cursor-pointer p-1 rounded"
          title="Zoom Out"
        >
          <i className="fa-solid fa-minus text-[11px]" aria-hidden="true" />
        </button>
        <span
          id="workflow-canvas-zoom-label"
          className="text-[11px] font-semibold text-slate-600 min-w-[36px] text-center select-none"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          id="workflow-canvas-zoom-in-btn"
          type="button"
          onClick={() => onZoomChange?.(Math.max(0.7, +(zoom + 0.1).toFixed(2)))}
          className="border-none bg-transparent text-slate-600 hover:text-slate-900 cursor-pointer p-1 rounded"
          title="Zoom In"
        >
          <i className="fa-solid fa-plus text-[11px]" aria-hidden="true" />
        </button>
      </div>

      <div
        id="workflow-canvas-topology-badge"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm pointer-events-auto ${
          isReady
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : nodeCount === 0
              ? 'bg-white text-slate-600 border-slate-200'
              : 'bg-amber-50 text-amber-800 border-amber-300'
        }`}
      >
        <i
          id="workflow-canvas-topology-icon"
          className={`fa-solid ${isReady ? 'fa-link' : nodeCount === 0 ? 'fa-circle-info' : 'fa-triangle-exclamation'}`}
          aria-hidden="true"
        />
        <span id="workflow-canvas-topology-text">
          {nodeCount === 0
            ? 'No pipeline steps added yet'
            : isReady
              ? `Single Chain Ready (${nodeCount} ${nodeCount === 1 ? 'step' : 'steps'})`
              : chainCount > 1
                ? `${chainCount} Disconnected Chains — Link into 1 chain`
                : `${chainCount || 1} Not Validated Chains — Validate before running`}
        </span>
      </div>
    </div>
  );
};

export default WorkflowCanvasToolbar;
