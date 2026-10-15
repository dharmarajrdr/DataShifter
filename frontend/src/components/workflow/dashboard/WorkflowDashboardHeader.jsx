import React from 'react';
import { Button } from '../../common';

export const WorkflowDashboardHeader = ({
  id = 'workflow-dashboard-header',
  className = '',
  canCreateWorkflow = false,
  onNewWorkflowClick,
}) => {
  return (
    <header
      id={id}
      className={`ds-workflow-header flex flex-wrap items-center justify-between gap-4 py-2 shrink-0 ${className}`}
    >
      <div id={`${id}-title-group`} className="ds-workflow-title-group">
        <h1
          id={`${id}-title`}
          className="ds-workflow-title text-xl font-bold text-slate-900 tracking-tight"
        >
          Workflows
        </h1>
        <p
          id={`${id}-subtitle`}
          className="ds-workflow-subtitle text-xs text-slate-500 mt-0.5"
        >
          Orchestrate multiple validated pipelines in series and parallel DAG execution
        </p>
      </div>

      <div id={`${id}-actions`} className="ds-workflow-actions flex items-center gap-2.5">
        {canCreateWorkflow && (
          <Button
            id={`${id}-create-btn`}
            className="ds-workflow-create-btn text-xs font-semibold px-3.5 py-1.5"
            variant="primary"
            onClick={onNewWorkflowClick}
          >
            <i id={`${id}-create-icon`} className="fa-solid fa-plus mr-1.5" />
            New Workflow
          </Button>
        )}
      </div>
    </header>
  );
};

export default WorkflowDashboardHeader;
