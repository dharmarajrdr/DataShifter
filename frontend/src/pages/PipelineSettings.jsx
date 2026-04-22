import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { FRSC, FRBC } from '../constants/layouts';
import { SETTINGS } from '../constants/literals';
import { PageHeader, Button, Toggle, Chip } from '../components/common';
import { settingsApi, connectionApi } from '../services/api';

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

const WriteModeSelector = ({ selected, onChange }) => {
  const modes = ['INSERT_ONLY', 'UPSERT', 'UPDATE_ONLY'];
  return (
    <div style={{ ...FRSC, gap: '6px' }}>
      {modes.map(mode => {
        const isActive = selected === mode;
        const info = SETTINGS.writeModes[mode];
        return (
          <div key={mode} onClick={() => onChange(mode)}
            style={{ flex: 1, padding: '10px', textAlign: 'center', cursor: 'pointer', border: isActive ? `2px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, background: isActive ? COLORS.accent.purpleLight : COLORS.background.primary }}>
            <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: isActive ? COLORS.accent.purpleText : COLORS.text.primary }}>{info.label}</p>
            <p style={{ fontSize: '10px', marginTop: '2px', color: isActive ? COLORS.brand.primary : COLORS.text.tertiary }}>{info.desc}</p>
          </div>
        );
      })}
    </div>
  );
};

const PipelineSettings = () => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [tableOverrides, setTableOverrides] = useState({});
  const { pipelineId } = useParams();
  const navigate = useNavigate();

  // Table pair management
  const [sourceTables, setSourceTables] = useState([]);
  const [targetTables, setTargetTables] = useState([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newSourceTable, setNewSourceTable] = useState('');
  const [newTargetTable, setNewTargetTable] = useState('');
  const [addingTable, setAddingTable] = useState(false);

  const fetchSettings = useCallback(() => {
    settingsApi.getByPipelineId(pipelineId).then(res => {
      setSettings(res.data);
      const overrides = {};
      (res.data.tables || []).forEach(pt => {
        (pt.targetMappings || []).forEach(ttm => {
          overrides[ttm.id] = ttm.writeMode || res.data.defaultWriteMode || 'UPSERT';
        });
      });
      setTableOverrides(overrides);

      // Fetch available tables from source and target connections
      if (res.data.sourceConnectionId) {
        connectionApi.listTables(res.data.sourceConnectionId).then(r => setSourceTables(r.data || [])).catch(() => {});
      }
      if (res.data.targetConnectionId) {
        connectionApi.listTables(res.data.targetConnectionId).then(r => setTargetTables(r.data || [])).catch(() => {});
      }
    });
  }, [pipelineId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  if (!settings) return null;

  const update = (key, value) => { setSettings(prev => ({ ...prev, [key]: value })); setHasChanges(true); };

  const updateTableWriteMode = (ttmId, mode) => { setTableOverrides(prev => ({ ...prev, [ttmId]: mode })); setHasChanges(true); };

  const isRunning = settings.status === 'RUNNING';

  const handleSave = async () => {
    if (isRunning) {
      setSaveMsg('Pause the pipeline before updating settings');
      setTimeout(() => setSaveMsg(null), 4000);
      return;
    }
    setSaving(true); setSaveMsg(null);
    try {
      const payload = {
        name: settings.name, description: settings.description, chunkSize: settings.chunkSize,
        defaultWriteMode: settings.defaultWriteMode, ignoreExceptions: settings.ignoreExceptions,
        maxErrorThreshold: settings.maxErrorThreshold, logSourceRow: settings.logSourceRow,
        sourcePoolSize: settings.sourcePoolSize, targetPoolSize: settings.targetPoolSize,
        previewInflightRecords: settings.previewInflightRecords,
        tableWriteModeOverrides: Object.entries(tableOverrides).map(([ttmId, mode]) => ({ targetTableMappingId: ttmId, writeMode: mode })),
      };
      await settingsApi.save(pipelineId, payload);
      setHasChanges(false);
      setSaveMsg('Settings saved');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg('Save failed: ' + (e?.response?.data?.message || e.message || 'Unknown error'));
    } finally { setSaving(false); }
  };

  const handleAddTablePair = async () => {
    if (!newSourceTable || !newTargetTable) return;
    setAddingTable(true);
    try {
      await settingsApi.addTablePair(pipelineId, newSourceTable, newTargetTable);
      setNewSourceTable(''); setNewTargetTable(''); setShowAddTable(false);
      fetchSettings(); // Refresh
    } catch (e) {
      setSaveMsg('Failed to add: ' + (e?.response?.data?.message || e.message));
      setTimeout(() => setSaveMsg(null), 3000);
    } finally { setAddingTable(false); }
  };

  const handleRemoveTablePair = async (ptId, label) => {
    if (!window.confirm(`Remove table pair "${label}"? Column mappings and transforms for this pair will be deleted.`)) return;
    try {
      await settingsApi.removeTablePair(pipelineId, ptId);
      fetchSettings();
    } catch (e) {
      setSaveMsg('Failed to remove: ' + (e?.response?.data?.message || e.message));
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  // Build all target mappings for per-table write mode
  const allTargetMappings = [];
  (settings.tables || []).forEach(pt => {
    (pt.targetMappings || []).forEach(ttm => {
      allTargetMappings.push({ ttmId: ttm.id, ptId: pt.id, sourceTable: pt.sourceTable, targetTable: ttm.targetTable, currentMode: tableOverrides[ttm.id] || settings.defaultWriteMode || 'UPSERT' });
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
                        <span onClick={() => handleRemoveTablePair(row.ptId, `${row.sourceTable} → ${row.targetTable}`)}
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
          {/* PROCESSING */}
          {/* ============================================================ */}
          <SectionTitle title={SETTINGS.processing.title} subtitle={SETTINGS.processing.subtitle} />
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>{SETTINGS.processing.chunkSize}</label>
            <div style={{ ...FRSC, gap: SPACING.sm }}>
              <input type="range" min="1000" max="100000" step="1000" value={settings.chunkSize}
                onChange={e => update('chunkSize', Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, fontFamily: 'monospace', minWidth: '70px', textAlign: 'right' }}>{settings.chunkSize.toLocaleString()}</span>
            </div>
            <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xxs }}>{SETTINGS.processing.chunkHint}</p>
          </div>
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xs }}>{SETTINGS.processing.defaultWriteMode}</label>
            <WriteModeSelector selected={settings.defaultWriteMode} onChange={v => update('defaultWriteMode', v)} />
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
                        <select value={row.currentMode} onChange={e => updateTableWriteMode(row.ttmId, e.target.value)}
                          style={{ padding: '4px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, background: '#fff' }}>
                          <option value="INSERT_ONLY">INSERT_ONLY</option>
                          <option value="UPSERT">UPSERT</option>
                          <option value="UPDATE_ONLY">UPDATE_ONLY</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineSettings;