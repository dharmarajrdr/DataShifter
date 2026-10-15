import React from 'react';
import CreateNamespaceModal from '../CreateNamespaceModal';
import ImportPipelineModal from '../ImportPipelineModal';

export const PipelineDashboardModals = ({
  id = 'pipeline-modals',
  showCreateNs,
  onCloseCreateNs,
  onNamespaceCreated,
  showImportModal,
  onCloseImport,
  onImportSuccess,
}) => {
  return (
    <>
      {showCreateNs && (
        <CreateNamespaceModal
          id={`${id}-create-ns`}
          onClose={onCloseCreateNs}
          onCreated={onNamespaceCreated}
        />
      )}
      {showImportModal && (
        <ImportPipelineModal
          id={`${id}-import`}
          isOpen={showImportModal}
          onClose={onCloseImport}
          onImportSuccess={onImportSuccess}
        />
      )}
    </>
  );
};

export default PipelineDashboardModals;
