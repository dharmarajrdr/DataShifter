import React from 'react';

export const PipelineNamespacePills = ({
  id = 'pipeline-ns-pills',
  className = '',
  namespaces = [],
  selectedNamespaces = [],
  onToggleNamespace,
  onClearNamespaces,
  onCreateNamespaceClick,
  canCreateNamespace = false,
}) => (
  <div id={id} className={`ds-ns-pills flex items-center gap-1.5 flex-wrap ${className}`}>
    <button
      id={`${id}-all`}
      type="button"
      onClick={onClearNamespaces}
      className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer font-medium ${
        selectedNamespaces.length === 0
          ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
      }`}
    >
      All Namespaces
    </button>
    {namespaces.map((ns) => {
      const isSel = selectedNamespaces.includes(ns.id);
      return (
        <button
          key={ns.id}
          id={`${id}-item-${ns.id}`}
          type="button"
          onClick={() => onToggleNamespace(ns.id)}
          className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer inline-flex items-center gap-1.5 font-medium ${
            isSel
              ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span
            id={`${id}-dot-${ns.id}`}
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: ns.color || '#6366F1' }}
          />
          <span>{ns.name}</span>
          {ns.pipelineCount !== undefined && (
            <span className="text-[10px] text-slate-400">({ns.pipelineCount})</span>
          )}
        </button>
      );
    })}
    {canCreateNamespace && (
      <button
        id={`${id}-new-btn`}
        type="button"
        onClick={onCreateNamespaceClick}
        title="Create namespace"
        className="text-xs px-2 py-0.5 rounded-full border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold inline-flex items-center gap-1 cursor-pointer"
      >
        <i className="fa-solid fa-plus text-[10px]" />
        <span>Namespace</span>
      </button>
    )}
  </div>
);

export default PipelineNamespacePills;
