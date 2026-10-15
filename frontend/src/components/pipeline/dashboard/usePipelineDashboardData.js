import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { namespaceApi, pipelineApi } from '../../../services/api';

export const usePipelineDashboardData = () => {
  const [pipelines, setPipelines] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedNamespaces, setSelectedNamespaces] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [dragOverNs, setDragOverNs] = useState(null);
  const [draggingPipelineId, setDraggingPipelineId] = useState(null);
  const [showCreateNs, setShowCreateNs] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const notification = useNotification();
  const { user, hasPermission } = useAuth();
  const canViewPipeline = hasPermission('pipeline:view');
  const canCreatePipeline = hasPermission('pipeline:create');
  const canCreateNamespace = hasPermission('namespace:create');

  const fetchAllData = useCallback(async () => {
    if (!canViewPipeline) { setLoading(false); return; }
    setLoading(true);
    try {
      const [pRes, nRes] = await Promise.all([pipelineApi.getAll(), namespaceApi.getAll()]);
      setPipelines(pRes.data || []);
      setNamespaces(nRes.data || []);
    } catch (e) { setError(e); } finally { setLoading(false); }
  }, [canViewPipeline]);

  useEffect(() => { fetchAllData(); }, [user?.orgId, fetchAllData]);

  const filteredPipelines = useMemo(() => {
    let r = pipelines;
    if (selectedNamespaces.length > 0) r = r.filter(p => selectedNamespaces.includes(p.namespaceId));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p => p.name.toLowerCase().includes(q) || (p.sourceName || '').toLowerCase().includes(q) || (p.targetName || '').toLowerCase().includes(q) || (p.status || '').toLowerCase().includes(q) || (p.namespaceName || '').toLowerCase().includes(q));
    }
    return r;
  }, [pipelines, search, selectedNamespaces]);

  const groupedPipelines = useMemo(() => {
    const groups = {};
    for (const ns of namespaces) groups[ns.id] = [];
    for (const p of filteredPipelines) {
      const nsId = p.namespaceId || 'ns-default';
      if (!groups[nsId]) groups[nsId] = [];
      groups[nsId].push(p);
    }
    return Object.keys(groups).sort((a, b) => {
      if (a === 'ns-default') return 1;
      if (b === 'ns-default') return -1;
      return (namespaces.find(n => n.id === a)?.name || '').localeCompare(namespaces.find(n => n.id === b)?.name || '');
    }).map(nsId => ({
      namespace: namespaces.find(n => n.id === nsId) || { id: nsId, name: 'Default', color: '#888780' },
      pipelines: groups[nsId],
    }));
  }, [filteredPipelines, namespaces]);

  const handleDropPipeline = useCallback(async (pipelineId, namespaceId, namespaceName) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline || pipeline.namespaceId === namespaceId) return;
    setPipelines(prev => prev.map(p => p.id === pipelineId ? { ...p, namespaceId, namespaceName } : p));
    try {
      await namespaceApi.movePipeline(pipelineId, namespaceId);
      notification.success(`Moved "${pipeline.name}" to ${namespaceName}`);
    } catch (e) {
      setPipelines(prev => prev.map(p => p.id === pipelineId ? { ...p, namespaceId: pipeline.namespaceId, namespaceName: pipeline.namespaceName } : p));
      notification.error(e.message || 'Failed to move pipeline');
    }
    setDraggingPipelineId(null);
  }, [pipelines, notification]);

  const toggleNamespace = (nsId) => setSelectedNamespaces(prev => prev.includes(nsId) ? prev.filter(id => id !== nsId) : [...prev, nsId]);
  const counts = { total: pipelines.length, running: pipelines.filter(p => p.status === 'RUNNING').length, errored: pipelines.filter(p => p.status === 'ERRORED').length, completed: pipelines.filter(p => p.status === 'COMPLETED').length };

  return { pipelines, namespaces, setNamespaces, search, setSearch, selectedNamespaces, setSelectedNamespaces, toggleNamespace, viewMode, setViewMode, dragOverNs, setDragOverNs, draggingPipelineId, setDraggingPipelineId, showCreateNs, setShowCreateNs, showImportModal, setShowImportModal, loading, error, canViewPipeline, canCreatePipeline, canCreateNamespace, fetchAllData, filteredPipelines, groupedPipelines, counts, handleDropPipeline };
};

export default usePipelineDashboardData;
