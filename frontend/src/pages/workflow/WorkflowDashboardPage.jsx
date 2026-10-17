import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiGuard, BarLoader, SkeletonLoader } from '../../components/common';
import {
  useWorkflowDashboardData,
  WorkflowDashboardHeader,
  WorkflowFilterToolbar,
  WorkflowGridBody,
  WorkflowKpiGrid,
} from '../../components/workflow/dashboard';

export const WorkflowDashboardPage = ({ id = 'workflow-dashboard-page' }) => {
  const navigate = useNavigate();
  const d = useWorkflowDashboardData();

  const loadingEl = (
    <div id={`${id}-loading`} className="p-4 space-y-4">
      <BarLoader id={`${id}-bar-loader`} />
      <SkeletonLoader id={`${id}-skeleton`} variant="table-row" count={5} />
    </div>
  );

  return (
    <ApiGuard
      error={d.error}
      loading={d.loading}
      onRetry={d.loadDashboard}
      loadingComponent={loadingEl}
    >
      <div
        id={id}
        className="ds-workflow-dashboard flex flex-col w-full max-w-7xl mx-auto h-[calc(100vh-7rem)] overflow-hidden gap-3.5"
      >
        <WorkflowDashboardHeader
          id={`${id}-header`}
          canCreateWorkflow={d.canCreateWorkflow}
          onNewWorkflowClick={() => navigate('/workflows/new')}
        />
        <WorkflowKpiGrid id={`${id}-kpis`} counts={d.counts} />
        <WorkflowFilterToolbar
          id={`${id}-toolbar`}
          namespaces={d.namespaces}
          selectedNamespace={d.selectedNamespace}
          onSelectNamespace={d.setSelectedNamespace}
          searchQuery={d.searchQuery}
          onSearchChange={d.setSearchQuery}
        />

        <div id={`${id}-scroll-wrap`} className="flex-1 min-h-0 overflow-y-auto pr-1">
          <WorkflowGridBody
            id={`${id}-grid-body`}
            workflows={d.filteredWorkflows}
            searchQuery={d.searchQuery}
            selectedNamespace={d.selectedNamespace}
            canCreateWorkflow={d.canCreateWorkflow}
            navigate={navigate}
          />
        </div>
      </div>
    </ApiGuard>
  );
};

export default WorkflowDashboardPage;
