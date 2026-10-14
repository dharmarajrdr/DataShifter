import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ConfirmationModal, PageHeader, Toggle } from '../components/common';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../constants/design';
import { FRBC, FRSC } from '../constants/layouts';
import { SETTINGS } from '../constants/literals';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { connectionApi, pipelineApi, settingsApi, cdcApi } from '../services/api';
import { ForbiddenPage } from './ErrorPage';

const SectionTitle = ({ title, subtitle }) => (
  <div style={{ marginBottom: SPACING.md }}>
    <p style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.medium }}>{title}</p>
    <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '2px' }}>{subtitle}</p>
  </div>
);

const Divider = () => <div style={{ height: '1px', background: COLORS.border.light, margin: `${SPACING.xl} 0` }} />;

const SettingRow = ({ label, description, children }) => (
  <div style={{ ...FRBC, padding: `${SPACING.sm} ${SPACING.md}`, background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs }}>
    <div>
      <p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium }}>{label}</p>
      <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px' }}>{description}</p>
    </div>
    {children}
  </div>
);

const PipelineSettings = () => {
  const { hasPermission } = useAuth();
  const canViewPipeline = hasPermission('pipeline:view');
  const canEditSettings = hasPermission('settings:edit');
  const canDeletePipeline = hasPermission('pipeline:delete');
  const canManageCdc = hasPermission('cdc:manage') || hasPermission('settings:edit');
  const [accessDenied, setAccessDenied] = useState(false);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [tableOverrides, setTableOverrides] = useState({});
  const [cdcCheckpoint, setCdcCheckpoint] = useState(null);
  const [loadingCheckpoint, setLoadingCheckpoint] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetScn, setResetTargetScn] = useState('');
  const [resettingCheckpoint, setResettingCheckpoint] = useState(false);
  const { pipelineId } = useParams();
  const navigate = useNavigate();

  // Table pair management
  const [sourceTables, setSourceTables] = useState([]);
  const [targetTables, setTargetTables] = useState([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newSourceTable, setNewSourceTable] = useState('');
  const [newTargetTable, setNewTargetTable] = useState('');
  const [addingTable, setAddingTable] = useState(false);

  const [pairToRemove, setPairToRemove] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const notification = useNotification();

  const fetchSettings = useCallback(() => {
    if (!canViewPipeline || !canEditSettings) return;
    settingsApi.getByPipelineId(pipelineId).then(res => {
      setSettings(res.data);
      const overrides = {};
      (res.data.tables || []).forEach(pt => {
        (pt.targetMappings || []).forEach(ttm => {
          overrides[ttm.id] = ttm.writeMode || 'UPSERT';
        });
      });
      setTableOverrides(overrides);

      // Fetch CDC checkpoint if pipeline is in CDC mode
      if (res.data.pipelineMode === 'CDC') {
        setLoadingCheckpoint(true);
        cdcApi.getCheckpoint(pipelineId)
          .then(cp => setCdcCheckpoint(cp.data))
          .catch(() => setCdcCheckpoint(null))
          .finally(() => setLoadingCheckpoint(false));
      }

      // Fetch available tables from source and target connections
      if (res.data.sourceConnectionId) {
        connectionApi.listTables(res.data.sourceConnectionId).then(r => setSourceTables(r.data || [])).catch(() => { });
      }
      if (res.data.targetConnectionId) {
        connectionApi.listTables(res.data.targetConnectionId).then(r => setTargetTables(r.data || [])).catch(() => { });
      }
    }).catch(err => {
      if (err?.response?.status === 403) {
        setAccessDenied(true);
      }
    });
  }, [pipelineId, canViewPipeline, canEditSettings]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  if (!canViewPipeline) {
    return (
      <ForbiddenPage
        missingPermission="pipeline:view"
        message="You don't have permission to view pipelines."
      />
    );
  }

  if (!canEditSettings || accessDenied) {
    return (
      <ForbiddenPage
        missingPermission="settings:edit"
        message="You don't have permission to edit pipeline settings."
      />
    );
  }

  if (!settings) return null;

  const update = (key, value) => { setSettings(prev => ({ ...prev, [key]: value })); setHasChanges(true); };

  const updateTableWriteMode = (ttmId, mode) => { setTableOverrides(prev => ({ ...prev, [ttmId]: mode })); setHasChanges(true); };

  const isRunning = settings.status === 'RUNNING';

  const handleResetCheckpoint = async () => {
    if (!canManageCdc || isRunning || resettingCheckpoint) return;
    setResettingCheckpoint(true);
    try {
      await cdcApi.resetCheckpoint(pipelineId, {
        targetScn: resetTargetScn ? resetTargetScn.trim() : null,
      });
      setShowResetModal(false);
      setResetTargetScn('');
      notification.success('CDC checkpoint reset successfully');
      // Refresh checkpoint
      cdcApi.getCheckpoint(pipelineId).then(cp => setCdcCheckpoint(cp.data)).catch(() => {});
    } catch (e) {
      notification.error('Failed to reset checkpoint: ' + (e?.response?.data?.message || e.message));
    } finally {
      setResettingCheckpoint(false);
    }
  };

  const handleSave = async () => {
    if (isRunning) {
      notification.warning('Pause the pipeline before updating settings');
      return;
    }
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: settings.name, description: settings.description, chunkSize: settings.chunkSize,
        defaultWriteMode: settings.defaultWriteMode || 'UPSERT', ignoreExceptions: settings.ignoreExceptions,
        maxErrorThreshold: settings.maxErrorThreshold, logSourceRow: settings.logSourceRow,
        sourcePoolSize: settings.sourcePoolSize, targetPoolSize: settings.targetPoolSize,
        previewInflightRecords: settings.previewInflightRecords,
        pipelineMode: settings.pipelineMode || 'BATCH',
        cdcLogType: settings.cdcLogType || 'ORACLE_TRAIL',
        cdcDirectoryPath: settings.cdcDirectoryPath,
        cdcFilePattern: settings.cdcFilePattern,
        cdcStartingScn: settings.cdcStartingScn,
        cdcFlushIntervalMs: settings.cdcFlushIntervalMs,
        cdcBatchSize: settings.cdcBatchSize,
        tableWriteModeOverrides: Object.entries(tableOverrides).map(([ttmId, mode]) => ({ targetTableMappingId: ttmId, writeMode: mode })),
      };
      await settingsApi.save(pipelineId, payload);
      setHasChanges(false);
      notification.success('Settings saved successfully');
    } catch (e) {
      notification.error('Save failed: ' + (e?.response?.data?.message || e.message || 'Unknown error'));
    } finally { setSaving(false); }
  };

  const handleAddTablePair = async () => {
    if (!newSourceTable || !newTargetTable) return;
    setAddingTable(true);
    try {
      await settingsApi.addTablePair(pipelineId, newSourceTable, newTargetTable);
      setNewSourceTable(''); setNewTargetTable(''); setShowAddTable(false);
      notification.success('Table pair added successfully');
      fetchSettings(); // Refresh
    } catch (e) {
      notification.error('Failed to add: ' + (e?.response?.data?.message || e.message));
    } finally { setAddingTable(false); }
  };

  const confirmRemoveTablePair = async () => {
    if (!pairToRemove) return;
    const { ptId, label } = pairToRemove;
    setPairToRemove(null);
    try {
      await settingsApi.removeTablePair(pipelineId, ptId);
      notification.success(`Table pair "${label}" removed`);
      fetchSettings();
    } catch (e) {
      notification.error('Failed to remove: ' + (e?.response?.data?.message || e.message));
    }
  };

  const confirmDeletePipeline = async () => {
    if (!canDeletePipeline || isRunning || deleting) return;
    setDeleting(true);
    try {
      await pipelineApi.delete(pipelineId);
      setShowDeleteConfirm(false);
      notification.success(`Pipeline "${settings.name}" deleted`);
      navigate('/pipelines');
    } catch (e) {
      notification.error('Failed to delete pipeline: ' + (e?.response?.data?.message || e.message));
    } finally {
      setDeleting(false);
    }
  };

  // Build all target mappings for per-table write mode
  const allTargetMappings = [];
  (settings.tables || []).forEach(pt => {
    (pt.targetMappings || []).forEach(ttm => {
      allTargetMappings.push({ ttmId: ttm.id, ptId: pt.id, sourceTable: pt.sourceTable, targetTable: ttm.targetTable, currentMode: tableOverrides[ttm.id] || ttm.writeMode || 'UPSERT' });
    });
  });

  // Tables already in the pipeline (for filtering available tables)
  const existingSourceTables = new Set((settings.tables || []).map(pt => pt.sourceTable));

  const selectStyle = { padding: '7px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.sm, background: '#fff', flex: 1 };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: settings.name, onClick: () => navigate(`/pipelines/${pipelineId}/monitor`) }, { label: SETTINGS.title }]}
        actions={
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            {saveMsg && <span style={{ fontSize: FONT.size.xs, color: saveMsg.includes('failed') || saveMsg.includes('Failed') || saveMsg.includes('Pause') ? '#A32D2D' : '#0F6E56' }}>{saveMsg}</span>}
            {hasChanges && !isRunning && <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>Unsaved changes</span>}
            {isRunning && <span style={{ fontSize: FONT.size.xs, color: COLORS.status.warning }}>Pipeline is running</span>}
            <Button onClick={handleSave} disabled={saving || !hasChanges || isRunning}>{saving ? 'Saving...' : SETTINGS.save}</Button>
          </div>
        }
        headerStyles={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm }}
      />

      <div style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
        <div style={{ maxWidth: '55%' }}>

          {/* ============================================================ */}
          {/* GENERAL */}
          {/* ============================================================ */}
          <SectionTitle title={SETTINGS.general.title} subtitle={SETTINGS.general.subtitle} />
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>{SETTINGS.general.name}</label>
            <input value={settings.name} onChange={e => update('name', e.target.value)}
              style={{ width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>{SETTINGS.general.description}</label>
            <input value={settings.description} onChange={e => update('description', e.target.value)}
              style={{ width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box' }} />
          </div>

          <Divider />

          {/* ============================================================ */}
          {/* EXECUTION MODE & CDC CONFIGURATION */}
          {/* ============================================================ */}
          <SectionTitle title="Execution mode & CDC" subtitle="Configure whether this pipeline operates in batch mode or real-time CDC streaming mode." />
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xs }}>Execution mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
              <div
                data-testid="settings-mode-batch"
                onClick={() => !isRunning && update('pipelineMode', 'BATCH')}
                style={{
                  padding: SPACING.sm,
                  borderRadius: BORDER_RADIUS.md,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  border: (settings.pipelineMode || 'BATCH') === 'BATCH' ? `2px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`,
                  background: (settings.pipelineMode || 'BATCH') === 'BATCH' ? COLORS.accent.purpleLight : COLORS.background.primary,
                  opacity: isRunning ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ ...FRBC, marginBottom: '2px' }}>
                  <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-layer-group" style={{ color: (settings.pipelineMode || 'BATCH') === 'BATCH' ? COLORS.brand.primary : COLORS.text.secondary }} />
                    Batch Migration
                  </span>
                  {(settings.pipelineMode || 'BATCH') === 'BATCH' && <span style={{ fontSize: '10px', color: COLORS.brand.primary, fontWeight: 600 }}>Active</span>}
                </div>
                <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>Full table snapshot migration</p>
              </div>

              <div
                data-testid="settings-mode-cdc"
                onClick={() => !isRunning && update('pipelineMode', 'CDC')}
                style={{
                  padding: SPACING.sm,
                  borderRadius: BORDER_RADIUS.md,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  border: settings.pipelineMode === 'CDC' ? `2px solid #0D9488` : `1px solid ${COLORS.border.light}`,
                  background: settings.pipelineMode === 'CDC' ? '#F0FDFA' : COLORS.background.primary,
                  opacity: isRunning ? 0.7 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ ...FRBC, marginBottom: '2px' }}>
                  <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-bolt" style={{ color: settings.pipelineMode === 'CDC' ? '#0D9488' : COLORS.text.secondary }} />
                    CDC Streaming
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 600, color: '#0D9488', background: '#CCFBF1', padding: '1px 5px', borderRadius: BORDER_RADIUS.pill }}>Real-time</span>
                </div>
                <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>Continuous trail/WAL capture</p>
              </div>
            </div>
          </div>

          {settings.pipelineMode === 'CDC' && (
            <div data-testid="settings-cdc-panel" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md }}>
              <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: '#0F766E', marginBottom: SPACING.sm, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-sliders" />
                Change Data Capture Settings
              </p>

              {/* CDC Log Format Selection */}
              <div style={{ marginBottom: SPACING.sm }}>
                <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
                  CDC Log Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
                  <div
                    data-testid="settings-logtype-oracle-trail"
                    onClick={() => !isRunning && update('cdcLogType', 'ORACLE_TRAIL')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: BORDER_RADIUS.sm,
                      cursor: isRunning ? 'not-allowed' : 'pointer',
                      border: (settings.cdcLogType || 'ORACLE_TRAIL') === 'ORACLE_TRAIL' ? '2px solid #0D9488' : `1px solid ${COLORS.border.light}`,
                      background: (settings.cdcLogType || 'ORACLE_TRAIL') === 'ORACLE_TRAIL' ? '#fff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: isRunning ? 0.7 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <i className="fa-solid fa-database" style={{ fontSize: '12px', color: (settings.cdcLogType || 'ORACLE_TRAIL') === 'ORACLE_TRAIL' ? '#0D9488' : COLORS.text.secondary }} />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text.primary }}>Oracle Trail</div>
                      <div style={{ fontSize: '9px', color: COLORS.text.secondary }}>GoldenGate SCN</div>
                    </div>
                  </div>

                  <div
                    data-testid="settings-logtype-postgres-wal"
                    onClick={() => !isRunning && update('cdcLogType', 'POSTGRES_WAL')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: BORDER_RADIUS.sm,
                      cursor: isRunning ? 'not-allowed' : 'pointer',
                      border: settings.cdcLogType === 'POSTGRES_WAL' ? '2px solid #0D9488' : `1px solid ${COLORS.border.light}`,
                      background: settings.cdcLogType === 'POSTGRES_WAL' ? '#fff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: isRunning ? 0.7 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <i className="fa-solid fa-file-waveform" style={{ fontSize: '12px', color: settings.cdcLogType === 'POSTGRES_WAL' ? '#0D9488' : COLORS.text.secondary }} />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text.primary }}>PostgreSQL WAL</div>
                      <div style={{ fontSize: '9px', color: COLORS.text.secondary }}>Write-Ahead Log LSN</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: SPACING.sm }}>
                <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
                  {settings.cdcLogType === 'POSTGRES_WAL' ? 'PostgreSQL WAL Directory Path' : 'Oracle Trail Directory Path'}
                </label>
                <input
                  data-testid="settings-cdc-directory"
                  value={settings.cdcDirectoryPath || ''}
                  onChange={e => update('cdcDirectoryPath', e.target.value)}
                  placeholder={settings.cdcLogType === 'POSTGRES_WAL' ? 'e.g. /var/lib/postgresql/data/pg_wal' : 'e.g. /u01/app/oracle/dirdat'}
                  disabled={isRunning}
                  style={{ width: '100%', padding: '6px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.sm, fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm, marginBottom: SPACING.sm }}>
                <div>
                  <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
                    File Pattern
                  </label>
                  <input
                    data-testid="settings-cdc-pattern"
                    value={settings.cdcFilePattern || (settings.cdcLogType === 'POSTGRES_WAL' ? '000000010000.*' : 'aa.*')}
                    onChange={e => update('cdcFilePattern', e.target.value)}
                    placeholder={settings.cdcLogType === 'POSTGRES_WAL' ? '000000010000.*' : 'aa.*'}
                    disabled={isRunning}
                    style={{ width: '100%', padding: '6px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.sm, fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
                    {settings.cdcLogType === 'POSTGRES_WAL' ? 'Starting LSN' : 'Starting SCN'}
                  </label>
                  <input
                    data-testid="settings-cdc-scn"
                    value={settings.cdcStartingScn || ''}
                    onChange={e => update('cdcStartingScn', e.target.value)}
                    placeholder={settings.cdcLogType === 'POSTGRES_WAL' ? 'e.g. 0/3D7E5D8 (empty for snapshot)' : 'Leave empty for snapshot SCN'}
                    disabled={isRunning}
                    style={{ width: '100%', padding: '6px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.sm, fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm, marginBottom: SPACING.md }}>
                <div>
                  <label style={{ fontSize: '11px', color: COLORS.text.secondary, display: 'block', marginBottom: '2px' }}>
                    Flush Interval (ms)
                  </label>
                  <input
                    data-testid="settings-cdc-flush-interval"
                    type="number"
                    min="50"
                    max="10000"
                    step="50"
                    value={settings.cdcFlushIntervalMs ?? 200}
                    onChange={e => update('cdcFlushIntervalMs', Number(e.target.value))}
                    disabled={isRunning}
                    style={{ width: '100%', padding: '5px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: COLORS.text.secondary, display: 'block', marginBottom: '2px' }}>
                    Micro-batch Size (events)
                  </label>
                  <input
                    data-testid="settings-cdc-batch-size"
                    type="number"
                    min="10"
                    max="10000"
                    step="50"
                    value={settings.cdcBatchSize ?? 500}
                    onChange={e => update('cdcBatchSize', Number(e.target.value))}
                    disabled={isRunning}
                    style={{ width: '100%', padding: '5px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Checkpoint Status & Reset */}
              <div style={{ borderTop: `1px solid #CBD5E1`, paddingTop: SPACING.sm }}>
                <div style={{ ...FRBC, marginBottom: '6px' }}>
                  <span style={{ fontSize: FONT.size.xs, fontWeight: 600, color: COLORS.text.primary }}>
                    Active Checkpoint State
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isRunning || !canManageCdc}
                    title={isRunning ? 'Cannot reset checkpoint while pipeline is running' : 'Rewind or adjust checkpoint position'}
                    onClick={() => setShowResetModal(true)}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    Reset Checkpoint
                  </Button>
                </div>
                {cdcCheckpoint ? (
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: BORDER_RADIUS.sm, padding: '8px 12px', fontSize: '11px', fontFamily: 'monospace' }}>
                    <div style={{ ...FRBC, marginBottom: '4px' }}>
                      <span style={{ color: COLORS.text.secondary }}>{settings.cdcLogType === 'POSTGRES_WAL' ? 'Last LSN:' : 'Last SCN:'}</span>
                      <span style={{ fontWeight: 600, color: '#0F766E' }}>{cdcCheckpoint.lastScn || '—'}</span>
                    </div>
                    <div style={{ ...FRBC, marginBottom: '4px' }}>
                      <span style={{ color: COLORS.text.secondary }}>{settings.cdcLogType === 'POSTGRES_WAL' ? 'Active Segment:' : 'Source File:'}</span>
                      <span>{cdcCheckpoint.sourceFile || '—'} (offset {cdcCheckpoint.fileOffset ?? 0})</span>
                    </div>
                    <div style={{ ...FRBC }}>
                      <span style={{ color: COLORS.text.secondary }}>Events Replayed:</span>
                      <span>{(cdcCheckpoint.eventsProcessed || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '11px', color: COLORS.text.tertiary, margin: 0 }}>
                    {loadingCheckpoint ? 'Loading checkpoint...' : 'No checkpoint recorded yet. Checkpoint will be established upon first stream start.'}
                  </p>
                )}
              </div>
            </div>
          )}

          <Divider />

          {/* ============================================================ */}
          {/* TABLE PAIRS */}
          {/* ============================================================ */}
          <SectionTitle title="Table pairs" subtitle="Source and target tables in this pipeline. Add or remove table pairs here." />
          <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', background: COLORS.background.primary, marginBottom: SPACING.md }}>
            {allTargetMappings.length === 0 ? (
              <div style={{ padding: SPACING.lg, textAlign: 'center', color: COLORS.text.tertiary, fontSize: FONT.size.sm }}>No table pairs configured.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT.size.sm }}>
                <thead>
                  <tr style={{ background: COLORS.background.secondary }}>
                    <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>#</th>
                    <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Source table</th>
                    <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Target table</th>
                    <th style={{ textAlign: 'right', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}></th>
                  </tr>
                </thead>
                <tbody>
                  {allTargetMappings.map((row, i) => (
                    <tr key={row.ptId} style={{ borderTop: `1px solid ${COLORS.border.light}` }}>
                      <td style={{ padding: `${SPACING.xs} ${SPACING.sm}`, color: COLORS.text.tertiary }}>{i + 1}</td>
                      <td style={{ padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium }}>{row.sourceTable}</td>
                      <td style={{ padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium }}>{row.targetTable}</td>
                      <td style={{ padding: `${SPACING.xs} ${SPACING.sm}`, textAlign: 'right' }}>
                        <span onClick={() => setPairToRemove({ ptId: row.ptId, label: `${row.sourceTable} → ${row.targetTable}` })}
                          style={{ fontSize: FONT.size.xs, color: '#A32D2D', cursor: 'pointer', fontWeight: 500 }}>Remove</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add table pair */}
          {showAddTable ? (
            <div style={{ border: `1px solid ${COLORS.brand.primary}`, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, background: COLORS.accent.purpleLight, marginBottom: SPACING.md }}>
              <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: SPACING.sm }}>Add table pair</p>
              <div style={{ ...FRSC, gap: SPACING.sm, marginBottom: SPACING.sm }}>
                <select value={newSourceTable} onChange={e => setNewSourceTable(e.target.value)} style={selectStyle}>
                  <option value="">Select source table</option>
                  {sourceTables.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ color: COLORS.text.tertiary, fontSize: FONT.size.sm }}>→</span>
                <select value={newTargetTable} onChange={e => setNewTargetTable(e.target.value)} style={selectStyle}>
                  <option value="">Select target table</option>
                  {targetTables.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ ...FRSC, gap: SPACING.xs }}>
                <Button onClick={handleAddTablePair} disabled={!newSourceTable || !newTargetTable || addingTable}>
                  {addingTable ? 'Adding...' : 'Add'}
                </Button>
                <Button variant="secondary" onClick={() => { setShowAddTable(false); setNewSourceTable(''); setNewTargetTable(''); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowAddTable(true)} style={{ marginBottom: SPACING.md }}>+ Add table pair</Button>
          )}


          <Divider />

          {/* ============================================================ */}
          {/* PER-TABLE WRITE MODE */}
          {/* ============================================================ */}
          <SectionTitle title={SETTINGS.perTable.title} subtitle={SETTINGS.perTable.subtitle} />
          {allTargetMappings.length === 0 ? (
            <div style={{ padding: SPACING.lg, textAlign: 'center', color: COLORS.text.tertiary, fontSize: FONT.size.sm, border: `1px dashed ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md }}>
              No table mappings configured yet.
            </div>
          ) : (
            <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', background: COLORS.background.primary }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT.size.sm }}>
                <thead>
                  <tr style={{ background: COLORS.background.secondary }}>
                    <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Source → Target</th>
                    <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Write mode</th>
                  </tr>
                </thead>
                <tbody>
                  {allTargetMappings.map(row => (
                    <tr key={row.ttmId} style={{ borderTop: `1px solid ${COLORS.border.light}` }}>
                      <td style={{ padding: `${SPACING.xs} ${SPACING.sm}` }}>
                        <span style={{ fontWeight: FONT.weight.medium }}>{row.sourceTable}</span>
                        <span style={{ color: COLORS.text.tertiary }}> → </span>
                        <span style={{ fontWeight: FONT.weight.medium }}>{row.targetTable}</span>
                      </td>
                      <td style={{ padding: `${SPACING.xs} ${SPACING.sm}` }}>
                        <div style={{ ...FRSC, gap: SPACING.xs, flexWrap: 'wrap' }}>
                          <select
                            value={(row.currentMode === 'INSERT_ONLY' || row.currentMode === 'INSERT_IGNORE') ? 'INSERT' : row.currentMode}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === 'INSERT') {
                                updateTableWriteMode(row.ttmId, 'INSERT_IGNORE');
                              } else {
                                updateTableWriteMode(row.ttmId, val);
                              }
                            }}
                            style={{ padding: '4px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, background: '#fff' }}
                          >
                            <option value="INSERT">Insert only</option>
                            <option value="UPSERT">Upsert</option>
                            <option value="UPDATE_ONLY">Update only</option>
                          </select>

                          {(row.currentMode === 'INSERT_ONLY' || row.currentMode === 'INSERT_IGNORE') && (
                            <div style={{ ...FRSC, gap: '4px' }}>
                              <label style={{ fontSize: '11px', color: COLORS.text.secondary, whiteSpace: 'nowrap' }}>
                                If PK exists:
                              </label>
                              <select
                                value={row.currentMode === 'INSERT_ONLY' ? 'Fail' : 'Ignore'}
                                onChange={e => updateTableWriteMode(row.ttmId, e.target.value === 'Fail' ? 'INSERT_ONLY' : 'INSERT_IGNORE')}
                                style={{ padding: '4px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, background: '#fff' }}
                              >
                                <option value="Ignore">Ignore</option>
                                <option value="Fail">Fail</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Divider />

          {/* ============================================================ */}
          {/* PROCESSING */}
          {/* ============================================================ */}
          <SectionTitle title={SETTINGS.processing.title} subtitle={SETTINGS.processing.subtitle} />
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>{SETTINGS.processing.chunkSize}</label>
            <div style={{ ...FRSC, gap: SPACING.sm }}>
              <input type="range" min="1000" max="100000" step="1000" value={settings.chunkSize || 10000}
                onChange={e => update('chunkSize', Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, fontFamily: 'monospace', minWidth: '70px', textAlign: 'right' }}>{(settings.chunkSize || 10000).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xxs }}>{SETTINGS.processing.chunkHint}</p>
          </div>

          <Divider />

          {/* ============================================================ */}
          {/* CONNECTION POOL */}
          {/* ============================================================ */}
          <SectionTitle title="Connection pool" subtitle="Number of database connections to establish. Higher = more throughput, but uses more DB resources." />
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Source DB connections</label>
            <div style={{ ...FRSC, gap: SPACING.sm }}>
              <input type="range" min="1" max="20" step="1" value={settings.sourcePoolSize || 5}
                onChange={e => update('sourcePoolSize', Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, fontFamily: 'monospace', minWidth: '30px', textAlign: 'right' }}>{settings.sourcePoolSize || 5}</span>
            </div>
            <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xxs }}>Connections for reading source data. Default: 5.</p>
          </div>
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Target DB connections</label>
            <div style={{ ...FRSC, gap: SPACING.sm }}>
              <input type="range" min="1" max="20" step="1" value={settings.targetPoolSize || 10}
                onChange={e => update('targetPoolSize', Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, fontFamily: 'monospace', minWidth: '30px', textAlign: 'right' }}>{settings.targetPoolSize || 10}</span>
            </div>
            <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xxs }}>Connections for writing target data. Default: 10.</p>
          </div>

          <Divider />

          {/* ============================================================ */}
          {/* ERROR HANDLING */}
          {/* ============================================================ */}
          <SectionTitle title={SETTINGS.errorHandling.title} subtitle={SETTINGS.errorHandling.subtitle} />
          <SettingRow label={SETTINGS.errorHandling.ignoreExceptions} description={SETTINGS.errorHandling.ignoreExceptionsDesc}>
            <Toggle checked={settings.ignoreExceptions} onChange={v => update('ignoreExceptions', v)} />
          </SettingRow>
          <SettingRow label={SETTINGS.errorHandling.maxThreshold} description={SETTINGS.errorHandling.maxThresholdDesc}>
            <input type="number" value={settings.maxErrorThreshold}
              onChange={e => update('maxErrorThreshold', Number(e.target.value))}
              style={{ width: '80px', padding: `${SPACING.xxs} ${SPACING.xs}`, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.sm, textAlign: 'right', fontFamily: 'monospace' }} />
          </SettingRow>
          <SettingRow label={SETTINGS.errorHandling.logSourceRow} description={SETTINGS.errorHandling.logSourceRowDesc}>
            <Toggle checked={settings.logSourceRow} onChange={v => update('logSourceRow', v)} />
          </SettingRow>

          <Divider />

          {/* ============================================================ */}
          {/* DATA PRIVACY */}
          {/* ============================================================ */}
          <SectionTitle title="Data privacy" subtitle="Control whether migrated data is visible in the Live Monitor." />
          <SettingRow label="Preview in-flight records" description="When enabled, the Live Monitor shows a real-time preview of records being migrated. Disable for confidential data.">
            <Toggle checked={settings.previewInflightRecords !== false} onChange={v => update('previewInflightRecords', v)} />
          </SettingRow>

          <Divider />

          {/* ============================================================ */}
          {/* DANGER ZONE */}
          {/* ============================================================ */}
          <SectionTitle title="Danger zone" subtitle="Irreversible and destructive actions for this pipeline." />
          <div style={{
            ...FRBC,
            padding: `${SPACING.sm} ${SPACING.md}`,
            background: COLORS.status.errorLight,
            border: `1px solid ${COLORS.status.error}`,
            borderRadius: BORDER_RADIUS.md,
            marginBottom: SPACING.xl,
          }}>
            <div>
              <p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, color: COLORS.status.errorDark }}>Delete pipeline</p>
              <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px' }}>
                {settings.workflowId ? (
                  <>
                    This pipeline is linked to workflow{' '}
                    <span
                      onClick={() => navigate(`/workflows/${settings.workflowId}/edit`)}
                      style={{ color: COLORS.brand.primary, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {settings.workflowName || 'Workflow'}
                    </span>{' '}
                    and cannot be deleted. Remove it from the workflow first.
                  </>
                ) : isRunning ? (
                  'Pause or stop the pipeline before deleting it.'
                ) : (
                  'Permanently delete this pipeline, its table mappings, transformations, and execution history. This cannot be undone.'
                )}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              disabled={!canDeletePipeline || isRunning || deleting || Boolean(settings.workflowId)}
              title={
                settings.workflowId
                  ? `Cannot delete pipeline while linked to workflow '${settings.workflowName}'`
                  : !canDeletePipeline
                    ? 'You do not have permission to delete pipelines'
                    : isRunning
                      ? 'Cannot delete a running pipeline'
                      : 'Delete this pipeline'
              }
              onClick={() => setShowDeleteConfirm(true)}
            >
              {deleting ? 'Deleting...' : 'Delete Pipeline'}
            </Button>
          </div>

        </div>
      </div>

      {/* Remove table pair confirmation modal */}
      <ConfirmationModal
        isOpen={!!pairToRemove}
        title="Remove Table Pair"
        message={`Are you sure you want to remove table pair "${pairToRemove?.label}"? Column mappings and transformations for this pair will be permanently deleted.`}
        color={COLORS.status.error}
        onClose={() => setPairToRemove(null)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setPairToRemove(null) },
          { label: 'Yes, remove', variant: 'danger', onClick: confirmRemoveTablePair },
        ]}
      />

      {/* Delete pipeline confirmation modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Pipeline"
        message={`Are you sure you want to delete pipeline "${settings.name}"? This cannot be undone.`}
        color={COLORS.status.error}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteConfirm(false) },
          { label: deleting ? 'Deleting...' : 'Yes, delete', variant: 'danger', onClick: confirmDeletePipeline },
        ]}
      />

      {/* Reset CDC Checkpoint Modal */}
      {showResetModal && (
        <div
          data-testid="cdc-reset-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: BORDER_RADIUS.lg,
              padding: SPACING.xl,
              width: '420px',
              maxWidth: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xs, color: COLORS.text.primary }}>
              Reset CDC Checkpoint
            </h3>
            <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.md, lineHeight: 1.4 }}>
              Rewind or reset the change tracking checkpoint. On the next execution, the stream reader will resume from the specified {settings.cdcLogType === 'POSTGRES_WAL' ? 'LSN' : 'SCN'}, or restart from the beginning if left blank.
            </p>

            <div style={{ marginBottom: SPACING.lg }}>
              <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
                {settings.cdcLogType === 'POSTGRES_WAL' ? 'Target LSN / Position (Optional)' : 'Target SCN / Position (Optional)'}
              </label>
              <input
                data-testid="input-reset-target-scn"
                value={resetTargetScn}
                onChange={e => setResetTargetScn(e.target.value)}
                placeholder="Leave blank to rewind to start"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: `1px solid ${COLORS.border.light}`,
                  borderRadius: BORDER_RADIUS.sm,
                  fontSize: FONT.size.sm,
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: COLORS.text.tertiary, marginTop: '4px', display: 'block' }}>
                {settings.cdcLogType === 'POSTGRES_WAL' ? 'Enter an LSN (e.g. 0/3D7E5D8) or leave empty to clear the checkpoint.' : 'Enter an SCN (e.g. 24589000) or leave empty to clear the checkpoint.'}
              </span>
            </div>

            <div style={{ ...FRBC }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setShowResetModal(false); setResetTargetScn(''); }}
                disabled={resettingCheckpoint}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleResetCheckpoint}
                disabled={resettingCheckpoint}
              >
                {resettingCheckpoint ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineSettings;