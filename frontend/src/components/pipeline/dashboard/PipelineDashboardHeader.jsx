import React from 'react';
import { Button } from '../../common';

export const PipelineDashboardHeader = ({
  id = 'pipeline-dashboard-header',
  className = '',
  canCreatePipeline = false,
  onImportClick,
  onNewPipelineClick,
}) => {
  return (
    <header
      id={id}
      className={`ds-pipeline-header flex flex-wrap items-center justify-between gap-4 py-2 shrink-0 ${className}`}
    >
      <div id={`${id}-title-group`} className="ds-pipeline-header-title-group">
        <h1
          id={`${id}-title`}
          className="ds-pipeline-header-title text-xl font-bold text-slate-900 tracking-tight"
        >
          Pipelines
        </h1>
        <p
          id={`${id}-subtitle`}
          className="ds-pipeline-header-subtitle text-xs text-slate-500 mt-0.5"
        >
          Monitor continuous CDC streams and scheduled batch replication pipelines
        </p>
      </div>

      <div
        id={`${id}-actions`}
        className="ds-pipeline-header-actions flex items-center gap-2.5"
      >
        <Button
          id={`${id}-import-btn`}
          className="ds-pipeline-import-btn text-xs font-semibold px-3 py-1.5"
          variant="secondary"
          onClick={onImportClick}
          disabled={!canCreatePipeline}
          title={!canCreatePipeline ? 'No permission to import pipelines' : undefined}
        >
          <i
            id={`${id}-import-icon`}
            className="fa-solid fa-file-import mr-1.5 text-slate-500"
          />
          Import Pipeline
        </Button>
        <Button
          id={`${id}-create-btn`}
          className="ds-pipeline-create-btn text-xs font-semibold px-3.5 py-1.5"
          variant="primary"
          onClick={onNewPipelineClick}
          disabled={!canCreatePipeline}
          title={!canCreatePipeline ? 'No permission to create pipelines' : undefined}
        >
          <i id={`${id}-create-icon`} className="fa-solid fa-plus mr-1.5" />
          New Pipeline
        </Button>
      </div>
    </header>
  );
};

export default PipelineDashboardHeader;
