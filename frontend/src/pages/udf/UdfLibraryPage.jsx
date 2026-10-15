import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { udfApi } from '../../services/api';
import { ForbiddenPage } from '../ErrorPage';
import { ApiGuard, BarLoader, ConfirmationModal } from '../../components/common';
import { UdfHeader, UdfMasterList, UdfDetailHeader, UdfMethodsTable, UdfDependencies, UdfUploadModal } from '../../components/udf';

export const UdfLibraryPage = () => {
  const { hasPermission } = useAuth();
  const notification = useNotification();
  const [udfs, setUdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('methods');
  const [showUpload, setShowUpload] = useState(false);
  const [udfToDelete, setUdfToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canView = hasPermission('udf:view');
  const canDelete = hasPermission('udf:delete');

  useEffect(() => {
    if (!canView) return setLoading(false);
    udfApi.getAll().then((res) => {
      const data = res.data || [];
      setUdfs(data);
      if (data.length > 0) setSelectedId(data[0].id);
    }).catch(setError).finally(() => setLoading(false));
  }, [canView]);

  const filteredJars = useMemo(() => udfs.filter((j) => {
    const matchStatus = statusFilter === 'ALL' || j.status === statusFilter;
    const matchQuery = !searchQuery || j.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  }), [udfs, statusFilter, searchQuery]);

  const selectedJar = useMemo(() => udfs.find((j) => j.id === selectedId) || filteredJars[0] || null, [udfs, selectedId, filteredJars]);

  const confirmDelete = async () => {
    if (!udfToDelete) return;
    setDeleting(true);
    try {
      await udfApi.delete(udfToDelete.id);
      setUdfs((prev) => prev.filter((item) => item.id !== udfToDelete.id));
      notification.success(`UDF "${udfToDelete.name}" deleted successfully`);
      setUdfToDelete(null);
    } catch (err) {
      notification.error(err.message || 'Failed to delete UDF');
    } finally { setDeleting(false); }
  };

  if (!canView) return <ForbiddenPage missingPermission="udf:view" message="You don't have permission to view UDFs." />;

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div id="udf-loading-wrap" className="p-6"><BarLoader /></div>}>
      <div id="udf-library-page" className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-surface-50 font-sans">
        <UdfHeader jarCount={udfs.length} onUploadClick={() => setShowUpload(true)} canUpload={canView} />
        <div id="udf-workspace-split" className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <UdfMasterList jars={filteredJars} selectedId={selectedJar?.id} onSelectJar={setSelectedId} searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />
          <main id="udf-detail-pane" className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-4 bg-surface-50">
            {selectedJar ? (
              <>
                <UdfDetailHeader jar={selectedJar} canDelete={canDelete} isDeleting={deleting} onDelete={setUdfToDelete} onDownload={() => notification.info(`Downloading binary for ${selectedJar.name}...`)} />
                <div id="udf-detail-tabs-bar" className="flex items-center gap-6 border-b border-surface-200">
                  <button id="udf-tab-methods" type="button" onClick={() => setActiveTab('methods')} className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'methods' ? 'border-brand-600 text-brand-600 font-semibold' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>Discovered Java Functions ({(selectedJar.functions || []).length})</button>
                  <button id="udf-tab-deps" type="button" onClick={() => setActiveTab('deps')} className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'deps' ? 'border-brand-600 text-brand-600 font-semibold' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>Pipeline Dependencies ({selectedJar.pipelineCount ?? 0})</button>
                  <button id="udf-tab-meta" type="button" onClick={() => setActiveTab('meta')} className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'meta' ? 'border-brand-600 text-brand-600 font-semibold' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>Artifact Metadata & Security</button>
                </div>
                {activeTab === 'methods' ? <UdfMethodsTable functions={selectedJar.functions} /> : <UdfDependencies jar={selectedJar} activeTab={activeTab} />}
              </>
            ) : <div id="udf-no-selection" className="p-8 text-center text-xs text-content-tertiary">Select a JAR artifact from the list to inspect bytecode.</div>}
          </main>
        </div>
        {showUpload && <UdfUploadModal onClose={() => setShowUpload(false)} onUploaded={(newJar) => { setUdfs((prev) => [newJar, ...prev]); setSelectedId(newJar.id); notification.success(`UDF "${newJar.name}" uploaded successfully`); }} />}
        <ConfirmationModal isOpen={!!udfToDelete} title="Delete UDF" message={`Are you sure you want to delete UDF "${udfToDelete?.name}"?`} color="#DC2626" onClose={() => setUdfToDelete(null)} actions={[{ label: 'Cancel', variant: 'secondary', onClick: () => setUdfToDelete(null) }, { label: 'Yes, delete', variant: 'danger', onClick: confirmDelete }]} />
      </div>
    </ApiGuard>
  );
};

export default UdfLibraryPage;
