import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useEventSource } from '../../hooks/useEventSource';
import { monitorApi, pipelineApi, cdcApi } from '../../services/api';
import { ForbiddenPage } from '../ErrorPage';
import { ApiGuard, BarLoader } from '../../components/common';
import { MonitorHeader, MonitorTelemetryBar, MonitorMetricsGrid, MonitorCdcOperations, MonitorSequentialTrack, MonitorInflightPreview } from '../../components/monitor';

export const LiveMonitorPage = () => {
  const { pipelineId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const notification = useNotification();
  const [data, setData] = useState({}), [cdcCheckpoint, setCdcCheckpoint] = useState(null);
  const [loading, setLoading] = useState(true), [actionLoading, setActionLoading] = useState(null);
  const [exportLoading, setExportLoading] = useState(false), [updateCount, setUpdateCount] = useState(0), [error, setError] = useState(null);

  const canViewPipeline = hasPermission('pipeline:view'), canViewMonitor = hasPermission('monitor:view');
  const canEditSettings = hasPermission('pipeline:settings'), canViewErrors = hasPermission('monitor:view_errors') || hasPermission('error:view');
  const canRun = hasPermission('pipeline:run'), canPause = hasPermission('pipeline:pause');
  const canStop = hasPermission('pipeline:stop'), canEdit = hasPermission('pipeline:edit') || hasPermission('pipeline:column-mapping');

  const fetchData = useCallback(async (showLoading = true) => {
    if (!canViewPipeline || !canViewMonitor) return setLoading(false);
    if (showLoading) setLoading(true);
    try {
      const res = await (monitorApi.getByPipelineId || monitorApi.getPipelineMetrics)(pipelineId);
      const metricsData = res?.data || {};
      setData(metricsData);
      if (metricsData.pipelineMode === 'CDC' || metricsData.isCdc || metricsData.currentLsn || metricsData.currentScn) {
        if (cdcApi?.getCheckpoint) cdcApi.getCheckpoint(pipelineId).then((c) => setCdcCheckpoint(c.data)).catch(() => {});
      }
    } catch (err) { setError(err); } finally { setLoading(false); }
  }, [pipelineId, canViewPipeline, canViewMonitor]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  const isRunning = Boolean(data.status && !['COMPLETED', 'ERRORED', 'PAUSED', 'DRAFT', 'NOT_VALIDATED', 'INVALID'].includes(data.status));
  const { connected, reconnectCount, retry, exhausted } = useEventSource({
    channels: pipelineId && isRunning ? [`pipeline:${pipelineId}`] : [], enabled: isRunning,
    onProgress: (ev) => {
      const d = ev?.payload;
      if (d) { setData((p) => ({ ...p, ...d, rowsProcessed: d.totalRowsProcessed ?? p.rowsProcessed })); setUpdateCount((c) => c + 1); }
    },
    onStatusChange: (ev) => { setData((p) => (p ? { ...p, status: ev.payload?.newStatus ?? p.status } : p)); },
  });

  const handleAction = async (action) => {
    if (action === 'EXPORT') return handleExport();
    setActionLoading(action);
    try {
      const res = await pipelineApi.performAction(pipelineId, action);
      if (action === 'VALIDATE') {
        const errs = res?.data?.validationErrors || [];
        if (res?.data?.status === 'VALIDATED' && errs.length === 0) notification.success('Pipeline validated successfully');
        else notification.warning(`Pipeline validation failed with ${errs.length} issue(s)`);
      } else if (action === 'START' || action === 'RESUME') notification.success('Pipeline started successfully');
      else if (action === 'PAUSE') notification.info('Pipeline paused');
      else if (action === 'STOP') notification.warning('Pipeline stopped');
      else notification.success(`Pipeline ${action.toLowerCase()} executed`);
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
  const isCdc = data.pipelineMode === 'CDC' || !!data.isCdc || !!data.cdcCheckpoint || !!data.currentLsn || !!data.currentScn || !!data.insertCount;

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div id="monitor-loading-box" className="p-6"><BarLoader /></div>}>
      <div id="live-monitor-page" className="flex flex-col min-h-[calc(100vh-64px)] bg-surface-50 font-sans">
        <MonitorHeader pipelineName={data.pipelineName} status={data.status} isCdc={isCdc} isLockedToWorkflow={Boolean(data.workflowId)} workflowId={data.workflowId} workflowName={data.workflowName} onAction={handleAction} onNavigate={(path) => navigate(path.startsWith('/') ? path : `/pipelines/${pipelineId}/${path}`)} canViewErrors={canViewErrors} canEditSettings={canEditSettings} canRun={canRun} canPause={canPause} canStop={canStop} canEdit={canEdit} actionLoading={actionLoading} exportLoading={exportLoading} errorCount={data.errorsSkipped || 0} />
        <main id="monitor-main-content" className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-5">
          <MonitorTelemetryBar connected={connected} exhausted={exhausted} reconnectCount={reconnectCount} updateCount={updateCount} lagSeconds={data.lagSeconds} currentLsn={data.currentLsn} onRefresh={() => fetchData(false)} onRetry={retry} isCdc={isCdc} status={data.status} isRunning={isRunning} />
          <MonitorMetricsGrid data={data} cdcCheckpoint={cdcCheckpoint} isCdc={isCdc} />
          {isCdc ? <MonitorCdcOperations insertCount={data.insertCount} updateCount={data.updateCount} deleteCount={data.deleteCount} filteredCount={data.filteredCount} /> : <MonitorSequentialTrack overallProgress={data.overallProgress} tables={data.tables || []} rowsProcessed={data.rowsProcessed || 0} totalRows={data.totalRows || 0} />}
          <MonitorInflightPreview records={data.inflightRecords || []} isCdc={isCdc} activeTable={data.currentTable || (data.tables?.[0]?.name)} targetTable={data.targetTable} previewDisabled={data.previewInflightRecords === false} status={data.status} />
        </main>
      </div>
    </ApiGuard>
  );
};

export default LiveMonitorPage;
