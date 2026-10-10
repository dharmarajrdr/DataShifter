import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiGuard, Button, Chip, Loader, MetricCard, PageHeader, ProgressBar, StatusBadge } from '../components/common';
import { FONT, SPACING } from '../constants/design';
import { FCSE, FRBC, FRSC, FRWSC } from '../constants/layouts';
import { MONITOR } from '../constants/literals';
import { useEventSource } from '../hooks/useEventSource';
import { monitorApi, pipelineApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ForbiddenPage } from './ErrorPage';

const TERMINAL_STATES = ['COMPLETED', 'ERRORED', 'PAUSED', 'DRAFT', 'NOT_VALIDATED', 'INVALID'];

const PlayIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 2l8 5-8 5V2z" fill="currentColor" /></svg>;
const PauseIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="2" width="3" height="10" rx=".8" fill="currentColor" /><rect x="8" y="2" width="3" height="10" rx=".8" fill="currentColor" /></svg>;
const StopIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2.5" y="2.5" width="9" height="9" rx="1.5" fill="currentColor" /></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 2.5v3.5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2.8 6C3.4 3.8 5.3 2.2 7.5 2.2c2.8 0 5 2.2 5 5s-2.2 5-5 5c-1.8 0-3.3-.9-4.2-2.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;

const getActions = (status) => {
  switch (status) {
    case 'DRAFT':
    case 'NOT_VALIDATED':
    case 'INVALID':
      return [{ action: 'VALIDATE', label: 'Validate', Icon: CheckIcon, variant: 'primary' }];
    case 'VALIDATED': return [{ action: 'START', label: 'Start', Icon: PlayIcon, variant: 'primary' }];
    case 'RUNNING': return [{ action: 'PAUSE', label: 'Pause', Icon: PauseIcon, variant: 'warning' }, { action: 'STOP', label: 'Stop', Icon: StopIcon, variant: 'danger' }];
    case 'PAUSED': return [{ action: 'RESUME', label: 'Resume', Icon: PlayIcon, variant: 'primary' }, { action: 'STOP', label: 'Stop', Icon: StopIcon, variant: 'danger' }];
    case 'COMPLETED': return [{ action: 'START', label: 'Re-run', Icon: PlayIcon, variant: 'secondary' }];
    case 'ERRORED': return [{ action: 'START', label: 'Retry', Icon: PlayIcon, variant: 'primary' }];
    default: return [];
  }
};

const variantStyles = {
  primary: { bg: '#534AB7', color: '#fff', hover: '#4A42A5' },
  secondary: { bg: '#F0F0ED', color: '#1A1A1A', hover: '#E8E8E5' },
  warning: { bg: '#FEF3C7', color: '#854F0B', hover: '#FDE68A' },
  danger: { bg: '#FAECE7', color: '#A32D2D', hover: '#F5C6B8' },
};

const ActionBtn = ({ action, label, Icon, variant, loading, onClick, disabled, title }) => {
  const s = variantStyles[variant] || variantStyles.secondary;
  const busy = loading === action;
  return (
    <button
      onClick={() => !busy && !disabled && onClick(action)}
      disabled={disabled || busy}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: 'none',
        background: s.bg, color: s.color, fontSize: '12px', fontWeight: 500,
        cursor: disabled ? 'not-allowed' : (busy ? 'wait' : 'pointer'),
        opacity: disabled ? 0.45 : (busy ? 0.6 : 1),
        transition: 'opacity 0.15s ease'
      }}
      onMouseEnter={e => { if (!busy && !disabled) e.currentTarget.style.background = s.hover; }}
      onMouseLeave={e => { if (!busy && !disabled) e.currentTarget.style.background = s.bg; }}>
      <Icon /><span>{busy ? `${label}...` : label}</span>
    </button>
  );
};

const LiveMonitor = () => {
  const { pipelineId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canViewPipeline = hasPermission('pipeline:view');
  const canViewMonitor = hasPermission('monitor:view');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!canViewPipeline || !canViewMonitor) {
      if (showLoading) setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try { const r = await monitorApi.getByPipelineId(pipelineId); setData(r.data); }
    catch (e) { setError(e); } finally { if (showLoading) setLoading(false); }
  }, [pipelineId, canViewPipeline, canViewMonitor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sseEnabled = data && !TERMINAL_STATES.includes(data.status);
  const { connected, reconnectCount, exhausted, retry } = useEventSource({
    channels: [`pipeline:${pipelineId}`], enabled: sseEnabled,
    onProgress: (ev) => { setData(p => { if (!p) return p; const d = ev.payload; return { ...p, rowsProcessed: d.totalRowsProcessed ?? p.rowsProcessed, rowsPerSec: d.rowsPerSec ?? p.rowsPerSec, avgRowsPerSec: d.avgRowsPerSec ?? p.avgRowsPerSec, overallProgress: d.overallProgress ?? p.overallProgress, eta: d.eta ?? p.eta, inflightRecords: d.inflightRecords ?? p.inflightRecords }; }); setUpdateCount(c => c + 1); },
    onStatusChange: (ev) => { setData(p => p ? { ...p, status: ev.payload.newStatus } : p); fetchData(); },
    onError: (ev) => { setData(p => p ? { ...p, errorsSkipped: (p.errorsSkipped || 0) + 1 } : p); },
  });

  const canRun = hasPermission('pipeline:run');
  const canPause = hasPermission('pipeline:pause');
  const canStop = hasPermission('pipeline:stop');
  const canEdit = hasPermission('pipeline:edit');
  const canEditSettings = hasPermission('settings:edit');
  const canViewErrors = hasPermission('monitor:view_errors');

  const getActionPermission = (act) => {
    switch (act) {
      case 'START':
      case 'RESUME':
        return { allowed: canRun, title: !canRun ? 'You do not have permission to run pipelines' : undefined };
      case 'PAUSE':
        return { allowed: canPause, title: !canPause ? 'You do not have permission to pause pipelines' : undefined };
      case 'STOP':
        return { allowed: canStop, title: !canStop ? 'You do not have permission to stop pipelines' : undefined };
      case 'VALIDATE':
        return { allowed: canEdit, title: !canEdit ? 'You do not have permission to edit pipelines' : undefined };
      default:
        return { allowed: true, title: undefined };
    }
  };

  const handleAction = async (action) => {
    const perm = getActionPermission(action);
    if (!perm.allowed) return;
    setActionLoading(action);
    try { await pipelineApi.performAction(pipelineId, action); fetchData(); }
    catch (e) { console.error(`Failed:`, e); } finally { setActionLoading(null); }
  };

  const tColor = (s) => s === 'COMPLETED' ? 'purple' : s === 'RUNNING' ? 'teal' : 'default';
  const iCols = data.inflightRecords?.length > 0 ? Object.keys(data.inflightRecords[0]) : [];
  const acts = getActions(data.status);

  if (!canViewPipeline) {
    return (
      <ForbiddenPage
        missingPermission="pipeline:view"
        message="You don't have permission to view pipelines."
      />
    );
  }

  if (!canViewMonitor) {
    return (
      <ForbiddenPage
        missingPermission="monitor:view"
        message="You don't have permission to view pipeline monitor."
      />
    );
  }

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<Loader variant="line" />}>
      <div>
        <PageHeader
          breadcrumbs={[{ label: data.pipelineName || 'Pipeline', onClick: () => navigate('/pipelines') }, { label: MONITOR.title }]}
          headerStyles={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm }}
          actions={<div style={{ ...FCSE }}>
            <div style={{ ...FRSC, gap: SPACING.sm }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={!canViewErrors}
                title={!canViewErrors ? 'You do not have permission to view error logs' : ''}
                onClick={() => navigate(`/pipelines/${pipelineId}/errors`)}
              >
                Error logs
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/pipelines/${pipelineId}/mapping`)}>Column mapping</Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!canEditSettings}
                title={!canEditSettings ? 'You do not have permission to edit pipeline settings' : ''}
                onClick={() => navigate(`/pipelines/${pipelineId}/settings`)}
              >
                Settings
              </Button>
            </div>
            <div style={{ ...FRSC, gap: SPACING.sm, marginTop: SPACING.lg }}>
              {data.status && data.status !== 'VALIDATED' && data.status !== 'NOT_VALIDATED' && data.status !== 'INVALID' && (
                <StatusBadge status={data.status} />
              )}
              {acts.map(a => {
                const perm = getActionPermission(a.action);
                return (
                  <ActionBtn
                    key={a.action}
                    {...a}
                    loading={actionLoading}
                    disabled={!perm.allowed}
                    title={perm.title}
                    onClick={handleAction}
                  />
                );
              })}
            </div>
          </div>}
        />

        {/* Validation issues banner */}
        {data.status === 'INVALID' && (
          <div style={{ background: '#FAECE7', border: '1px solid #D85A30', borderRadius: '8px', padding: `${SPACING.sm} ${SPACING.md}`, marginBottom: SPACING.md }}>
            <div style={{ ...FRBC, marginBottom: '6px' }}>
              <span style={{ fontSize: FONT.size.sm, fontWeight: 500, color: '#712B13' }}>
                Pipeline has validation issues — resolve them before starting
              </span>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/pipelines/${pipelineId}/mapping`)}>
                Edit column mappings
              </Button>
            </div>
            {(data.validationErrors || []).map((err, i) => (
              <div key={i} style={{ fontSize: FONT.size.xs, color: '#712B13', padding: '2px 0' }}>
                • {err}
              </div>
            ))}
          </div>
        )}

        {/* {data.status === 'NOT_VALIDATED' && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '8px', padding: `${SPACING.sm} ${SPACING.md}`, marginBottom: SPACING.md }}>
            <div style={{ ...FRBC }}>
              <span style={{ fontSize: FONT.size.sm, fontWeight: 500, color: '#854F0B' }}>
                Pipeline mappings were modified and not yet validated. Validate the pipeline before starting.
              </span>
              <Button variant="secondary" size="sm" onClick={() => handleAction('VALIDATE')} disabled={actionLoading === 'VALIDATE'}>
                {actionLoading === 'VALIDATE' ? 'Validating...' : 'Validate now'}
              </Button>
            </div>
          </div>
        )} */}

        {/* Connection bar */}
        <div style={{ ...FRBC, marginBottom: SPACING.md, padding: `${SPACING.xs} ${SPACING.md}`, background: '#F7F7F5', borderRadius: '8px' }}>
          <div style={{ ...FRSC, gap: SPACING.sm }}>
            <span style={{ fontSize: '12px', color: '#6B6B6B' }}>Live:</span>
            {connected ? <div style={{ ...FRSC, gap: '6px' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F6E56', animation: 'pulse 2s infinite' }} /><span style={{ fontSize: '12px', color: '#0F6E56', fontWeight: 500 }}>Connected</span></div>
              : exhausted ? <div style={{ ...FRSC, gap: '6px' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A32D2D' }} /><span style={{ fontSize: '12px', color: '#A32D2D' }}>Disconnected</span><Button variant="secondary" size="sm" onClick={retry} style={{ fontSize: '11px', padding: '2px 8px' }}>Retry</Button></div>
                : sseEnabled ? <div style={{ ...FRSC, gap: '6px' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#854F0B', animation: 'pulse 1.5s infinite' }} /><span style={{ fontSize: '12px', color: '#854F0B' }}>{reconnectCount > 0 ? `Reconnecting (${reconnectCount}/5)...` : 'Connecting...'}</span></div>
                  : <span style={{ fontSize: '12px', color: '#9B9B9B' }}>Inactive</span>}
          </div>
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            {updateCount > 0 && <span style={{ fontSize: '11px', color: '#9B9B9B' }}>{updateCount} updates</span>}
            <button onClick={fetchData} style={{ background: 'none', border: '1px solid #E8E8E5', borderRadius: '6px', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B6B' }} title="Refresh"><RefreshIcon /></button>
          </div>
        </div>

        {/* Metrics */}
        <div key={updateCount} style={{ ...FRSC, gap: SPACING.sm, marginBottom: SPACING.lg, /* animation: updateCount > 1 ? 'fadeIn .3s ease' : 'none' */ }}>
          <MetricCard label={MONITOR.rowsProcessed} value={data.rowsProcessed ? data.rowsProcessed.toLocaleString() : '0'} />
          <MetricCard label={MONITOR.rowsPerSec} value={data.rowsPerSec ? data.rowsPerSec.toLocaleString() : '0'} />
          <MetricCard label="Avg rows/sec" value={data.avgRowsPerSec ? data.avgRowsPerSec.toLocaleString() : '0'} color="#534AB7" />
          <MetricCard label={MONITOR.errorsSkipped} value={data.errorsSkipped || 0} color="#A32D2D" />
          <MetricCard label={MONITOR.eta} value={data.eta || '—'} />
        </div>

        {/* Progress */}
        <div style={{ marginBottom: SPACING.lg }}>
          <div style={{ ...FRBC, marginBottom: '6px' }}><span style={{ fontSize: '13px', color: '#6B6B6B' }}>{MONITOR.overallProgress}</span><span style={{ fontSize: '13px', fontWeight: 500 }}>{data.overallProgress ? data.overallProgress.toFixed(1) : 0}%</span></div>
          <ProgressBar progress={data.overallProgress || 0} height="8px" showLabel={false} />
        </div>

        {/* Tables */}
        {data.tables?.length > 0 && (
          <div style={{ marginBottom: SPACING.lg }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#6B6B6B', marginBottom: SPACING.xs }}>{MONITOR.tableProgress}</p>
            <div style={{ ...FRWSC, gap: '6px' }}>{data.tables.map(t => <Chip key={t.name} label={`${t.name} ${t.progress > 0 ? t.progress + '%' : ''}`} colorScheme={tColor(t.status)} />)}</div>
          </div>
        )}

        {/* In-flight */}
        <div>
          <div style={{ ...FRBC, marginBottom: SPACING.xs }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#6B6B6B' }}>{MONITOR.inflightRecords}</p>
            {data.previewInflightRecords !== false && iCols.length > 0 && <span style={{ fontSize: '11px', color: '#9B9B9B' }}>{data.inflightRecords.length} records</span>}
          </div>
          <div style={{ border: '1px solid #E8E8E5', borderRadius: '8px', overflow: 'auto', background: '#fff', maxHeight: 'calc(100vh - 375px)' }}>
            {data.previewInflightRecords === false ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9B9B9B', fontSize: '13px' }}>
                <span style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}>🔒</span>
                In-flight records preview is disabled for this pipeline.
                <br /><span style={{ fontSize: '11px', color: '#B4B2A9', marginTop: '4px', display: 'inline-block' }}>Enable it in Pipeline Settings → Data privacy.</span>
              </div>
            ) : iCols.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9B9B9B', fontSize: '13px' }}>{data.status === 'RUNNING' ? 'Waiting for records...' : 'No in-flight records'}</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: '#F7F7F5' }}>{iCols.map(c => <th key={c} style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 500, color: '#6B6B6B', whiteSpace: 'nowrap' }}>{c}</th>)}</tr></thead>
                <tbody>{data.inflightRecords.map((r, i) => <tr key={`${updateCount}-${i}`} style={{ borderTop: '1px solid #E8E8E5', background: i % 2 ? '#F7F7F5' : 'transparent' }}>{iCols.map(c => <td key={c} style={{ padding: '7px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{String(r[c])}</td>)}</tr>)}</tbody>
              </table>
            )}
          </div>
        </div>

        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    </ApiGuard>
  );
};

export default LiveMonitor;