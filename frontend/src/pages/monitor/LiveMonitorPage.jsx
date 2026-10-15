import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useEventSource } from '../../hooks/useEventSource';
import { monitorApi, pipelineApi, cdcApi } from '../../services/api';
import { ForbiddenPage } from '../ErrorPage';
import { ApiGuard, BarLoader } from '../../components/common';
import {
  MonitorHeader, MonitorTelemetryBar, MonitorMetricsGrid,
  MonitorCdcOperations, MonitorSequentialTrack, MonitorInflightPreview,
} from '../../components/monitor';

export const LiveMonitorPage = () => {
  const { pipelineId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const notification = useNotification();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [error, setError] = useState(null);

  const canViewPipeline = hasPermission('pipeline:view');
  const canViewMonitor = hasPermission('monitor:view');
  const canEditSettings = hasPermission('pipeline:update');
  const canViewErrors = hasPermission('error:view');

  const fetchData = useCallback(async (showLoading = true) => {
    if (!canViewPipeline || !canViewMonitor) return setLoading(false);
    if (showLoading) setLoading(true);
    try {
      const res = await monitorApi.getPipelineMetrics(pipelineId);
      setData(res.data || {});
    } catch (err) { setError(err); } finally { setLoading(false); }
  }, [pipelineId, canViewPipeline, canViewMonitor]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  const handleSseMessage = useCallback((eventData) => {
    try {
      const parsed = typeof eventData === 'string' ? JSON.parse(eventData) : eventData;
      setData((prev) => ({ ...prev, ...parsed }));
      setUpdateCount((c) => c + 1);
    } catch { /* ignore parse error */ }
  }, []);

  const { connected, reconnectCount, retry, exhausted } = useEventSource(
    pipelineId ? `/api/v1/monitor/pipelines/${pipelineId}/stream` : null,
    handleSseMessage,
    true
  );

  const handleAction = async (action) => {
    if (action === 'EXPORT') return handleExport();
    setActionLoading(action);
    try {
      await monitorApi.triggerAction(pipelineId, action);
      notification.success(`Pipeline ${action.toLowerCase()} executed`);
      fetchData(false);
    } catch (err) { notification.error(err.message || 'Action failed'); } finally { setActionLoading(null); }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await pipelineApi.export(pipelineId);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${data.pipelineName || 'pipeline'}.json`;
      a.click(); URL.revokeObjectURL(url);
      notification.success('Pipeline exported');
    } catch (err) { notification.error(err.message || 'Export failed'); } finally { setExportLoading(false); }
  };

  if (!canViewPipeline || !canViewMonitor) return <ForbiddenPage missingPermission="monitor:view" message="Permission denied." />;
  const isCdc = !!(data.isCdc || data.cdcCheckpoint || data.currentLsn || data.insertCount);

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div id="monitor-loading-box" className="p-6"><BarLoader /></div>}>
      <div id="live-monitor-page" className="flex flex-col min-h-[calc(100vh-64px)] bg-surface-50 font-sans">
        <MonitorHeader pipelineName={data.pipelineName} status={data.status} isCdc={isCdc} isLockedToWorkflow={!!data.workflowId} workflowName={data.workflowName} onAction={handleAction} onNavigate={(path) => navigate(path.startsWith('/') ? path : `/pipelines/${pipelineId}/${path}`)} canViewErrors={canViewErrors} canEditSettings={canEditSettings} actionLoading={actionLoading} exportLoading={exportLoading} errorCount={data.errorsSkipped || 0} />
        <main id="monitor-main-content" className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-5">
          <MonitorTelemetryBar connected={connected} exhausted={exhausted} reconnectCount={reconnectCount} updateCount={updateCount} lagSeconds={data.lagSeconds} currentLsn={data.currentLsn} onRefresh={() => fetchData(false)} onRetry={retry} isCdc={isCdc} />
          <MonitorMetricsGrid data={data} isCdc={isCdc} isWal={!data.currentScn} />
          {isCdc ? <MonitorCdcOperations insertCount={data.insertCount} updateCount={data.updateCount} deleteCount={data.deleteCount} filteredCount={data.filteredCount} /> : <MonitorSequentialTrack overallProgress={data.overallProgress} tables={data.tables || []} rowsProcessed={data.rowsProcessed || 0} totalRows={data.totalRows || 0} />}
          <MonitorInflightPreview records={data.inflightRecords || []} isCdc={isCdc} activeTable={data.currentTable || (data.tables?.[0]?.name)} targetTable={data.targetTable} previewDisabled={data.previewInflightRecords === false} status={data.status} />
        </main>
      </div>
    </ApiGuard>
  );
};

export default LiveMonitorPage;
