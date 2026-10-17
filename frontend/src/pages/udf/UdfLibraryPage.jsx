import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { udfApi } from '../../services/api';
import { adapterApi } from '../../services/adapterApi';
import { ForbiddenPage } from '../ErrorPage';
import { ApiGuard, BarLoader } from '../../components/common';
import { AdapterDetailPane, AdapterMasterList, AdapterUploadModal, LibraryHeader } from '../../components/library';
import { UdfDependencies, UdfDetailHeader, UdfMasterList, UdfMethodsTable, UdfUploadModal } from '../../components/udf';

export const UdfLibraryPage = () => {
  const { tab = 'adapters' } = useParams();
  const navigate = useNavigate();
  const mainTab = tab === 'udfs' ? 'udfs' : 'adapters';
  const { hasPermission } = useAuth();
  const notification = useNotification();
  const [adapters, setAdapters] = useState([]);
  const [selectedAdapterId, setSelectedAdapterId] = useState(null);
  const [adapterQuery, setAdapterQuery] = useState('');
  const [adapterFilter, setAdapterFilter] = useState('ALL');
  const [udfs, setUdfs] = useState([]);
  const [selectedUdfId, setSelectedUdfId] = useState(null);
  const [udfQuery, setUdfQuery] = useState('');
  const [udfFilter, setUdfFilter] = useState('ALL');
  const [udfTab, setUdfTab] = useState('methods');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const canView = hasPermission('udf:view');

  useEffect(() => {
    if (!canView) return setLoading(false);
    Promise.all([adapterApi.getAll(), udfApi.getAll()]).then(([adpRes, udfRes]) => {
      const adpData = adpRes.data || [], udfData = udfRes.data || [];
      setAdapters(adpData); if (adpData.length > 0) setSelectedAdapterId(adpData[0].id);
      setUdfs(udfData); if (udfData.length > 0) setSelectedUdfId(udfData[0].id);
    }).catch(setError).finally(() => setLoading(false));
  }, [canView]);

  const filteredAdapters = useMemo(() => adapters.filter((a) => {
    const matchType = adapterFilter === 'ALL' || (adapterFilter === 'READER' && a.adapterType === 'READER') || (adapterFilter === 'WRITER' && a.adapterType === 'WRITER') || (adapterFilter === 'CDC' && a.supportedMode === 'CDC');
    return matchType && (!adapterQuery || a.name.toLowerCase().includes(adapterQuery.toLowerCase()) || a.adapterKey.toLowerCase().includes(adapterQuery.toLowerCase()));
  }), [adapters, adapterFilter, adapterQuery]);
  const selectedAdapter = useMemo(() => adapters.find((a) => a.id === selectedAdapterId) || filteredAdapters[0] || null, [adapters, selectedAdapterId, filteredAdapters]);

  const filteredUdfs = useMemo(() => udfs.filter((j) => (udfFilter === 'ALL' || j.status === udfFilter) && (!udfQuery || j.name.toLowerCase().includes(udfQuery.toLowerCase()))), [udfs, udfFilter, udfQuery]);
  const selectedJar = useMemo(() => udfs.find((j) => j.id === selectedUdfId) || filteredUdfs[0] || null, [udfs, selectedUdfId, filteredUdfs]);

  if (!canView) return <ForbiddenPage missingPermission="udf:view" message="You don't have permission to view the Library." />;

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div id="lib-loading-wrap" className="p-6"><BarLoader /></div>}>
      <div id="library-page" className="flex flex-col w-full max-w-7xl mx-auto h-[calc(100vh-7rem)] overflow-hidden bg-surface-50 font-sans">
        <LibraryHeader activeTab={mainTab} onTabChange={(t) => navigate(`/library/${t}`)} adapterCount={adapters.length} udfCount={udfs.length} onUploadClick={() => setShowUpload(true)} canUpload={canView} />
        {mainTab === 'adapters' ? (
          <div id="library-adapters-split" className="flex flex-1 overflow-hidden flex-col md:flex-row">
            <AdapterMasterList adapters={filteredAdapters} selectedId={selectedAdapter?.id} onSelectAdapter={setSelectedAdapterId} searchQuery={adapterQuery} onSearchChange={setAdapterQuery} typeFilter={adapterFilter} onTypeFilterChange={setAdapterFilter} />
            <AdapterDetailPane adapter={selectedAdapter} onCreatePipeline={(a) => notification.info(`Starting pipeline with ${a.name}...`)} />
          </div>
        ) : (
          <div id="library-udfs-split" className="flex flex-1 overflow-hidden flex-col md:flex-row">
            <UdfMasterList jars={filteredUdfs} selectedId={selectedJar?.id} onSelectJar={setSelectedUdfId} searchQuery={udfQuery} onSearchChange={setUdfQuery} statusFilter={udfFilter} onStatusFilterChange={setUdfFilter} />
            <main id="udf-detail-pane" className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-4 bg-surface-50">
              {selectedJar ? (
                <>
                  <UdfDetailHeader jar={selectedJar} canDelete={false} isDeleting={false} onDelete={() => {}} onDownload={() => notification.info(`Downloading binary for ${selectedJar.name}...`)} />
                  <div id="udf-detail-tabs-bar" className="flex items-center gap-6 border-b border-surface-200">
                    <button id="udf-tab-methods" type="button" onClick={() => setUdfTab('methods')} className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${udfTab === 'methods' ? 'border-brand-600 text-brand-600 font-semibold' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>Discovered Java Functions ({(selectedJar.functions || []).length})</button>
                    <button id="udf-tab-deps" type="button" onClick={() => setUdfTab('deps')} className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${udfTab === 'deps' ? 'border-brand-600 text-brand-600 font-semibold' : 'border-transparent text-content-secondary hover:text-content-primary'}`}>Pipeline Dependencies ({selectedJar.pipelineCount ?? 0})</button>
                  </div>
                  {udfTab === 'methods' ? <UdfMethodsTable functions={selectedJar.functions} /> : <UdfDependencies jar={selectedJar} activeTab={udfTab} />}
                </>
              ) : <div id="udf-no-selection" className="p-8 text-center text-xs text-content-tertiary">Select a JAR artifact from the list to inspect functions.</div>}
            </main>
          </div>
        )}
        {showUpload && mainTab === 'adapters' && <AdapterUploadModal onClose={() => setShowUpload(false)} onUploaded={(newAdp) => { setAdapters((p) => [newAdp, ...p]); setSelectedAdapterId(newAdp.id); notification.success(`Adapter "${newAdp.name}" installed successfully`); }} />}
        {showUpload && mainTab === 'udfs' && <UdfUploadModal onClose={() => setShowUpload(false)} onUploaded={(newJar) => { setUdfs((p) => [newJar, ...p]); setSelectedUdfId(newJar.id); notification.success(`UDF "${newJar.name}" uploaded successfully`); }} />}
      </div>
    </ApiGuard>
  );
};

export default UdfLibraryPage;
