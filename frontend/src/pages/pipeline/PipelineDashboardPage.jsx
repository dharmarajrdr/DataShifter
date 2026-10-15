import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiGuard, BarLoader, SkeletonLoader } from '../../components/common';
import {
  PipelineDashboardHeader,
  PipelineDashboardModals,
  PipelineFilterToolbar,
  PipelineGridBody,
  PipelineKpiGrid,
  PipelineTableView,
  usePipelineDashboardData,
} from '../../components/pipeline/dashboard';
import { ForbiddenPage } from '../ErrorPage';

export const PipelineDashboardPage = ({ id = 'pipeline-dashboard-page' }) => {
  const navigate = useNavigate();
  const d = usePipelineDashboardData();

  if (!d.canViewPipeline) {
    return (
      <ForbiddenPage
        id={`${id}-forbidden`}
        missingPermission="pipeline:view"
        message="You don't have permission to view pipelines."
      />
    );
  }

  const loadingEl = (
    <div id={`${id}-loading`} className="p-4 space-y-4">
      <BarLoader id={`${id}-bar-loader`} />
      <SkeletonLoader id={`${id}-skeleton`} variant="table-row" count={5} />
    </div>
  );

  return (
    <ApiGuard error={d.error} loading={d.loading} loadingComponent={loadingEl}>
      <div id={id} className="ds-pipeline-dashboard flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden gap-3.5">
        <PipelineDashboardHeader
          id={`${id}-header`}
          canCreatePipeline={d.canCreatePipeline}
          onImportClick={() => d.setShowImportModal(true)}
          onNewPipelineClick={() => navigate('/pipelines/new')}
        />
        <PipelineKpiGrid id={`${id}-kpis`} counts={d.counts} />
        <PipelineFilterToolbar
          id={`${id}-toolbar`}
          namespaces={d.namespaces}
          selectedNamespaces={d.selectedNamespaces}
          onToggleNamespace={d.toggleNamespace}
          onClearNamespaces={() => d.setSelectedNamespaces([])}
          onCreateNamespaceClick={() => d.setShowCreateNs(true)}
          canCreateNamespace={d.canCreateNamespace}
          search={d.search}
          onSearchChange={d.setSearch}
          viewMode={d.viewMode}
          onViewModeChange={d.setViewMode}
        />

        <div id={`${id}-content-area`} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {d.viewMode === 'grid' ? (
            <div id={`${id}-grid-scroll-wrap`} className="flex-1 min-h-0 overflow-y-auto pr-1">
              <PipelineGridBody
                id={`${id}-grid-body`}
                filteredPipelines={d.filteredPipelines}
                groupedPipelines={d.groupedPipelines}
                draggingPipelineId={d.draggingPipelineId}
                search={d.search}
                selectedNamespaces={d.selectedNamespaces}
                navigate={navigate}
                onDragStart={d.setDraggingPipelineId}
                onDropPipeline={d.handleDropPipeline}
                dragOverNs={d.dragOverNs}
                setDragOverNs={d.setDragOverNs}
              />
            </div>
          ) : (
            <PipelineTableView id={`${id}-table-view`} pipelines={d.filteredPipelines} navigate={navigate} />
          )}
        </div>

        <PipelineDashboardModals
          id={`${id}-modals`}
          showCreateNs={d.showCreateNs}
          onCloseCreateNs={() => d.setShowCreateNs(false)}
          onNamespaceCreated={(ns) => d.setNamespaces((prev) => [...prev, ns])}
          showImportModal={d.showImportModal}
          onCloseImport={() => d.setShowImportModal(false)}
          onImportSuccess={() => d.fetchAllData()}
        />
      </div>
    </ApiGuard>
  );
};

export default PipelineDashboardPage;
