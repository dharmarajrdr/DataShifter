import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useEventSource } from '../../../hooks/useEventSource';
import { namespaceApi, workflowApi } from '../../../services/api';

export const useWorkflowDashboardData = () => {
  const { user, hasPermission } = useAuth();
  const canCreateWorkflow = hasPermission('workflow:create');

  const [workflows, setWorkflows] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('ALL');

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const [wfRes, nsRes] = await Promise.all([
        workflowApi.getAll(),
        namespaceApi.getAll().catch(() => ({ data: [] })),
      ]);
      setWorkflows(wfRes.data || []);
      setNamespaces(nsRes.data || []);
    } catch (err) { setError(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [user?.orgId, loadDashboard]);

  const sseChannels = useMemo(() => {
    const ch = [];
    if (user?.orgId) ch.push(`org:${user.orgId}`);
    workflows.forEach((w) => {
      if (w.status === 'RUNNING' || w.status === 'PAUSED') ch.push(`workflow:${w.id}`);
    });
    return ch;
  }, [user?.orgId, workflows]);

  const sseEnabled = useMemo(
    () => workflows.some((w) => w.status === 'RUNNING' || w.status === 'PAUSED'),
    [workflows]
  );

  useEventSource({
    channels: sseChannels,
    enabled: sseEnabled,
    onStatusChange: (ev) => {
      const d = ev?.payload;
      if (!d || !d.workflowId) return;
      setWorkflows((prev) => prev.map((w) => {
        if (w.id !== d.workflowId) return w;
        const statuses = d.pipelineStatuses || {};
        const completedSteps = Object.values(statuses).filter((s) => s === 'COMPLETED').length;
        const totalSteps = w.pipelineCount || 1;
        const overallProgress = d.status === 'COMPLETED' ? 100 : Math.min(100, Math.round((completedSteps / totalSteps) * 1000) / 10);
        return { ...w, status: d.status || w.status, overallProgress };
      }));
      if (d.status === 'COMPLETED' || d.status === 'FAILED' || d.status === 'STOPPED') loadDashboard();
    },
  });

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((w) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = w.name.toLowerCase().includes(q) || (w.orderedPipelineNames || []).some((p) => p.toLowerCase().includes(q));
      const matchesNs = selectedNamespace === 'ALL' || (selectedNamespace === 'DEFAULT' ? !w.namespaceId : w.namespaceId === selectedNamespace);
      return matchesSearch && matchesNs;
    });
  }, [workflows, searchQuery, selectedNamespace]);

  const counts = {
    total: workflows.length,
    ready: workflows.filter((w) => w.status === 'READY' || w.singleChainReady).length,
    running: workflows.filter((w) => w.status === 'RUNNING').length,
    failed: workflows.filter((w) => w.status === 'FAILED' || w.status === 'ERRORED').length,
  };

  return { workflows, namespaces, loading, error, searchQuery, setSearchQuery, selectedNamespace, setSelectedNamespace, filteredWorkflows, counts, canCreateWorkflow, loadDashboard };
};

export default useWorkflowDashboardData;
