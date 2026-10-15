import React from 'react';
import { Button } from '../../common';
import WorkflowCard from './WorkflowCard';

export const WorkflowGridBody = ({
  id = 'workflow-grid-body',
  className = '',
  workflows = [],
  searchQuery = '',
  selectedNamespace = 'ALL',
  canCreateWorkflow = false,
  navigate,
}) => {
  if (workflows.length === 0) {
    return (
      <div
        id={`${id}-empty`}
        className={`ds-workflow-empty p-10 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white/50 flex flex-col items-center justify-center ${className}`}
      >
        <div
          id={`${id}-empty-icon-box`}
          className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3"
        >
          <i id={`${id}-empty-icon`} className="fa-solid fa-diagram-project text-xl" />
        </div>
        <h3 id={`${id}-empty-title`} className="text-base font-semibold text-slate-800 mb-1">
          No workflows found
        </h3>
        <p id={`${id}-empty-desc`} className="text-xs text-slate-500 max-w-sm mb-4">
          {searchQuery || selectedNamespace !== 'ALL'
            ? 'No workflows match your search or namespace filter criteria.'
            : 'Chain multiple validated pipelines together in series or parallel to orchestrate data migrations.'}
        </p>
        {canCreateWorkflow && (
          <Button
            id={`${id}-empty-create-btn`}
            variant="primary"
            onClick={() => navigate('/workflows/new')}
            className="text-xs font-semibold px-3.5 py-1.5"
          >
            <i className="fa-solid fa-plus mr-1.5" />
            Create your first workflow
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`ds-workflow-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 ${className}`}
    >
      {workflows.map((wf) => (
        <WorkflowCard
          key={wf.id}
          id={`${id}-card-${wf.id}`}
          workflow={wf}
          navigate={navigate}
        />
      ))}
    </div>
  );
};

export default WorkflowGridBody;
