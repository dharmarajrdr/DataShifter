import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { FRSC, FRBC, FCCC } from '../constants/layouts';
import { WIZARD } from '../constants/literals';
import { PageHeader, Button, Chip, SortableList, Loader } from '../components/common';
import CreateNamespaceModal from '../components/pipeline/CreateNamespaceModal';
import { namespaceApi, connectionApi, pipelineApi } from '../services/api';

const StepIndicator = ({ steps, currentStep }) => (
  <div style={{ ...FRSC, gap: 0, padding: `0 ${SPACING.xxl}`, marginBottom: SPACING.sm }}>
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <div style={{ ...FCCC, gap: '6px', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: i <= currentStep ? COLORS.brand.primary : 'transparent', border: i <= currentStep ? 'none' : `2px solid ${i === currentStep + 1 ? COLORS.brand.primary : COLORS.border.medium}`, color: i <= currentStep ? '#fff' : (i === currentStep + 1 ? COLORS.brand.primary : COLORS.text.secondary), ...FCCC, fontSize: FONT.size.md, fontWeight: FONT.weight.medium }}>{i + 1}</div>
          <span style={{ fontSize: FONT.size.xs, fontWeight: i <= currentStep ? FONT.weight.medium : FONT.weight.regular, color: i <= currentStep ? COLORS.brand.primary : COLORS.text.secondary }}>{step}</span>
        </div>
        {i < steps.length - 1 && <div style={{ flex: 1, height: '2px', marginBottom: '18px', background: i < currentStep ? COLORS.brand.primary : COLORS.border.light }} />}
      </React.Fragment>
    ))}
  </div>
);

const FieldError = ({ message }) => message ? <p style={{ fontSize: FONT.size.xs, color: COLORS.status.errorDark, marginTop: '4px' }}>{message}</p> : null;

const StepBasics = ({ config, setConfig, namespaces, onCreateNamespace, errors }) => (
  <div style={{ maxWidth: '480px' }}>
    <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>Pipeline basics</h3>
    <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>Give your pipeline a name, description, and assign it to a namespace.</p>
    <div style={{ marginBottom: SPACING.md }}>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Pipeline name <span style={{ color: COLORS.status.error }}>*</span></label>
      <input value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })} style={{ width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${errors.name ? COLORS.status.error : COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box' }} placeholder="e.g., Orders migration" />
      <FieldError message={errors.name} />
    </div>
    <div style={{ marginBottom: SPACING.md }}>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Description</label>
      <textarea value={config.description} onChange={e => setConfig({ ...config, description: e.target.value })} rows={3} style={{ width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box', resize: 'vertical' }} placeholder="Describe what this pipeline does" />
    </div>
    <div>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Namespace</label>
      <div style={{ ...FRSC, gap: '6px', flexWrap: 'wrap' }}>
        {namespaces.map(ns => (
          <div key={ns.id} onClick={() => setConfig({ ...config, namespaceId: ns.id })} style={{ padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md, cursor: 'pointer', border: config.namespaceId === ns.id ? `2px solid ${ns.color || COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`, background: config.namespaceId === ns.id ? (ns.color || COLORS.brand.primary) + '15' : COLORS.background.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '2px', background: ns.color || COLORS.brand.primary }} />
            <span style={{ fontSize: FONT.size.sm, fontWeight: config.namespaceId === ns.id ? FONT.weight.medium : FONT.weight.regular, color: config.namespaceId === ns.id ? (ns.color || COLORS.brand.primary) : COLORS.text.primary }}>{ns.name}</span>
          </div>
        ))}
        <div onClick={onCreateNamespace} style={{ padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md, cursor: 'pointer', border: `1px dashed ${COLORS.brand.primary}`, background: COLORS.background.primary, display: 'flex', alignItems: 'center', gap: '4px' }} onMouseEnter={e => { e.currentTarget.style.background = COLORS.accent.purpleLight; }} onMouseLeave={e => { e.currentTarget.style.background = COLORS.background.primary; }}>
          <span style={{ fontSize: '14px', color: COLORS.brand.primary, lineHeight: 1 }}>+</span>
        </div>
      </div>
    </div>
  </div>
);

const StepConnections = ({ config, setConfig, connections, errors }) => {
  const connectedList = connections.filter(c => c.status === 'CONNECTED');
  const handleSelect = (role, connId) => setConfig({ ...config, [role]: config[role] === connId ? '' : connId });
  return (
    <div>
      <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>Select connections</h3>
      <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>Choose source and target database connections.</p>
      {connectedList.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: COLORS.text.tertiary, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.lg }}>No connected databases found.</div>}
      <div style={{ ...FRSC, gap: SPACING.lg, alignItems: 'flex-start' }}>
        {['source', 'target'].map(role => (
          <div key={role} style={{ flex: 1 }}>
            <label style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xs, textTransform: 'capitalize' }}>{role} connection <span style={{ color: COLORS.status.error }}>*</span></label>
            {connectedList.map(conn => {
              const isSelected = config[role] === conn.id;
              return (
                <div key={conn.id} onClick={() => handleSelect(role, conn.id)} style={{ padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, border: isSelected ? `2px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`, background: isSelected ? COLORS.accent.purpleLight : COLORS.background.primary, cursor: 'pointer' }}>
                  <div style={{ ...FRBC }}><div><p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>{conn.name}</p><p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>{conn.dbType} — {conn.host}</p></div>{isSelected && <span style={{ fontSize: '10px', color: COLORS.brand.primary, fontWeight: FONT.weight.medium }}>Selected</span>}</div>
                </div>
              );
            })}
            <FieldError message={errors[role]} />
          </div>
        ))}
      </div>
      {config.source && config.target && config.source === config.target && <div style={{ marginTop: SPACING.sm, padding: `${SPACING.xs} 10px`, background: COLORS.status.infoLight, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, color: COLORS.status.infoText }}>Same connection for source and target — migrating within the same database.</div>}
    </div>
  );
};

const TablePickerPanel = ({ label, accent, allTables, selectedTables, onAdd, onRemove, onAddAll, onRemoveAll, loading, emptyMessage, errors, errorKey }) => {
  const [search, setSearch] = useState('');
  const available = (allTables || []).filter(t => !selectedTables.includes(t) && t.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: accent, marginBottom: '6px' }}>{label}</p>
      {loading && <Loader variant="spinner" size="sm" height="80px" message="Fetching tables..." />}
      {!loading && allTables.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: COLORS.text.tertiary, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs }}>{emptyMessage}</div>}
      {!loading && allTables.length > 0 && (
        <>
          <div style={{ marginBottom: SPACING.sm }}>
            <div style={{ ...FRBC, marginBottom: '4px' }}>
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>Available ({available.length})</span>
              {available.length > 0 && <button onClick={onAddAll} style={{ background: 'none', border: 'none', fontSize: FONT.size.xs, color: COLORS.brand.primary, cursor: 'pointer' }}>Add all</button>}
            </div>
            <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, padding: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', padding: '5px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, marginBottom: '4px', boxSizing: 'border-box' }} />
              {available.length === 0 && <div style={{ padding: '8px', fontSize: FONT.size.xs, color: COLORS.text.tertiary, textAlign: 'center' }}>{search ? 'No match' : 'All added'}</div>}
              {available.map(t => (
                <div key={t} onClick={() => onAdd(t)} style={{ ...FRBC, padding: '4px 8px', fontSize: FONT.size.xs, color: COLORS.text.secondary, borderRadius: BORDER_RADIUS.sm, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = COLORS.background.secondary} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{t}</span><span style={{ fontSize: '16px', color: COLORS.text.tertiary }}>+</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...FRBC, marginBottom: '4px' }}>
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>Selected ({selectedTables.length})</span>
              {selectedTables.length > 0 && <button onClick={onRemoveAll} style={{ background: 'none', border: 'none', fontSize: FONT.size.xs, color: COLORS.status.errorDark, cursor: 'pointer' }}>Clear</button>}
            </div>
            {selectedTables.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: COLORS.text.tertiary, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs }}>Click tables above to add</div>
            ) : (
              <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, maxHeight: '180px', overflowY: 'auto' }}>
                {selectedTables.map((t, i) => (
                  <div key={t} style={{ ...FRBC, padding: '5px 10px', fontSize: FONT.size.xs, borderTop: i > 0 ? `1px solid ${COLORS.border.light}` : 'none' }}>
                    <span style={{ fontWeight: FONT.weight.medium }}>{t}</span>
                    <span onClick={() => onRemove(t)} style={{ cursor: 'pointer', color: COLORS.text.tertiary, fontSize: '14px' }}>×</span>
                  </div>
                ))}
              </div>
            )}
            <FieldError message={errors?.[errorKey]} />
          </div>
        </>
      )}
    </div>
  );
};

const StepTables = ({ config, setConfig, sourceTables, targetTables, loadingSourceTables, loadingTargetTables, errors }) => (
  <div>
    <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>Select tables</h3>
    <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>Choose source and target tables involved in this migration. Column mapping is configured after creation.</p>
    <div style={{ ...FRSC, gap: SPACING.lg, alignItems: 'flex-start' }}>
      <TablePickerPanel label="Source tables" accent={COLORS.accent.purpleText} allTables={sourceTables} selectedTables={config.selectedSourceTables}
        onAdd={t => setConfig({ ...config, selectedSourceTables: [...config.selectedSourceTables, t] })}
        onRemove={t => setConfig({ ...config, selectedSourceTables: config.selectedSourceTables.filter(x => x !== t) })}
        onAddAll={() => setConfig({ ...config, selectedSourceTables: [...config.selectedSourceTables, ...sourceTables.filter(t => !config.selectedSourceTables.includes(t))] })}
        onRemoveAll={() => setConfig({ ...config, selectedSourceTables: [] })}
        loading={loadingSourceTables} emptyMessage={config.source ? 'No tables found.' : 'Select source connection first.'} errors={errors} errorKey="selectedSourceTables" />
      <div style={{ ...FCCC, paddingTop: '40px', flexShrink: 0, color: COLORS.text.tertiary }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke={COLORS.text.tertiary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <TablePickerPanel label="Target tables" accent="#085041" allTables={targetTables} selectedTables={config.selectedTargetTables}
        onAdd={t => setConfig({ ...config, selectedTargetTables: [...config.selectedTargetTables, t] })}
        onRemove={t => setConfig({ ...config, selectedTargetTables: config.selectedTargetTables.filter(x => x !== t) })}
        onAddAll={() => setConfig({ ...config, selectedTargetTables: [...config.selectedTargetTables, ...targetTables.filter(t => !config.selectedTargetTables.includes(t))] })}
        onRemoveAll={() => setConfig({ ...config, selectedTargetTables: [] })}
        loading={loadingTargetTables} emptyMessage={config.target ? 'No tables found.' : 'Select target connection first.'} errors={errors} errorKey="selectedTargetTables" />
    </div>
    {(config.selectedSourceTables.length > 0 || config.selectedTargetTables.length > 0) && (
      <div style={{ marginTop: SPACING.md, padding: `${SPACING.xs} ${SPACING.md}`, background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
        {config.selectedSourceTables.length} source and {config.selectedTargetTables.length} target table{config.selectedTargetTables.length !== 1 ? 's' : ''} selected. Column mapping configured after creation.
      </div>
    )}
  </div>
);

const StepMapping = () => (
  <div style={{ ...FCCC, padding: SPACING.xxxl, color: COLORS.text.secondary }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: COLORS.brand.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 9h6M3 15h6M15 9h6M15 15h6M9 9l6 6M9 15l6-6" stroke={COLORS.brand.primary} strokeWidth="1.5" strokeLinecap="round" /></svg>
    </div>
    <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xs, color: COLORS.text.primary }}>Column mapping</p>
    <p style={{ fontSize: FONT.size.md, textAlign: 'center', maxWidth: '440px', lineHeight: 1.5 }}>
      After creating the pipeline, map columns from source to target tables on the mapping board. Supports 1:1, 1:N, and N:1 patterns — any source column can map to any target column across tables.
    </p>
  </div>
);

const StepReview = ({ config, namespaces, connections }) => {
  const source = connections.find(c => c.id === config.source);
  const target = connections.find(c => c.id === config.target);
  const ns = namespaces.find(n => n.id === config.namespaceId);
  return (
    <div style={{ maxWidth: '560px' }}>
      <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.lg }}>Review pipeline</h3>
      {[['Name', config.name], ['Description', config.description || '(none)'], ['Namespace', ns?.name || 'Default'], ['Source', source ? `${source.name} (${source.dbType})` : '—'], ['Target', target ? `${target.name} (${target.dbType})` : '—']].map(([l, v]) => (
        <div key={l} style={{ ...FRSC, gap: SPACING.md, marginBottom: SPACING.sm, fontSize: FONT.size.md }}><span style={{ width: '140px', color: COLORS.text.secondary, flexShrink: 0 }}>{l}</span><span style={{ fontWeight: FONT.weight.medium }}>{v}</span></div>
      ))}
      <div style={{ marginTop: SPACING.md }}><p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs }}>Source tables ({config.selectedSourceTables.length}):</p><div style={{ ...FRSC, gap: '4px', flexWrap: 'wrap' }}>{config.selectedSourceTables.map(t => <Chip key={t} label={t} colorScheme="purple" />)}</div></div>
      <div style={{ marginTop: SPACING.sm }}><p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs }}>Target tables ({config.selectedTargetTables.length}):</p><div style={{ ...FRSC, gap: '4px', flexWrap: 'wrap' }}>{config.selectedTargetTables.map(t => <Chip key={t} label={t} colorScheme="teal" />)}</div></div>
    </div>
  );
};

const validateStep = (step, config) => {
  const e = {};
  switch (step) {
    case 0: if (!config.name.trim()) e.name = 'Required'; else if (config.name.trim().length < 3) e.name = 'Min 3 characters'; break;
    case 1: if (!config.source) e.source = 'Select source'; if (!config.target) e.target = 'Select target'; break;
    case 2: if (!config.selectedSourceTables.length) e.selectedSourceTables = 'Select at least one source table'; if (!config.selectedTargetTables.length) e.selectedTargetTables = 'Select at least one target table'; break;
    default: break;
  }
  return e;
};

const PipelineWizard = () => {
  const [step, setStep] = useState(0);
  const [namespaces, setNamespaces] = useState([]);
  const [connections, setConnections] = useState([]);
  const [sourceTables, setSourceTables] = useState([]);
  const [targetTables, setTargetTables] = useState([]);
  const [loadingSourceTables, setLoadingSourceTables] = useState(false);
  const [loadingTargetTables, setLoadingTargetTables] = useState(false);
  const [showCreateNs, setShowCreateNs] = useState(false);
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [config, setConfig] = useState({ name: '', description: '', namespaceId: '', source: '', target: '', selectedSourceTables: [], selectedTargetTables: [] });
  const navigate = useNavigate();

  useEffect(() => {
    namespaceApi.getAll().then(res => { const l = res.data || []; setNamespaces(l); const d = l.find(n => n.name === 'Default'); if (d) setConfig(p => ({ ...p, namespaceId: d.id })); });
    connectionApi.getAll().then(res => setConnections(res.data || []));
  }, []);

  useEffect(() => {
    if (!config.source) { setSourceTables([]); return; }
    setLoadingSourceTables(true); setSourceTables([]);
    setConfig(p => ({ ...p, selectedSourceTables: [] }));
    connectionApi.listTables(config.source).then(r => setSourceTables(r.data || [])).catch(() => setSourceTables([])).finally(() => setLoadingSourceTables(false));
  }, [config.source]);

  useEffect(() => {
    if (!config.target) { setTargetTables([]); return; }
    setLoadingTargetTables(true); setTargetTables([]);
    setConfig(p => ({ ...p, selectedTargetTables: [] }));
    connectionApi.listTables(config.target).then(r => setTargetTables(r.data || [])).catch(() => setTargetTables([])).finally(() => setLoadingTargetTables(false));
  }, [config.target]);

  useEffect(() => { setErrors({}); }, [config.name, config.source, config.target, config.selectedSourceTables.length, config.selectedTargetTables.length]);

  const handleNamespaceCreated = (ns) => { setNamespaces(p => [...p, ns]); setConfig(p => ({ ...p, namespaceId: ns.id })); };
  const handleNext = () => { const e = validateStep(step, config); if (Object.keys(e).length) { setErrors(e); return; } setErrors({}); setStep(step + 1); };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const payload = {
        name: config.name.trim(), description: config.description.trim(),
        namespaceId: config.namespaceId || null,
        sourceConnectionId: config.source, targetConnectionId: config.target,
        sourceTables: config.selectedSourceTables,
        targetTables: config.selectedTargetTables,
        tables: config.selectedSourceTables.map((t, i) => ({ sourceTable: t, executionOrder: i })),
      };
      const res = await pipelineApi.create(payload);
      navigate(res.data?.id ? `/pipelines/${res.data.id}/mapping` : '/pipelines');
    } catch (err) { setErrors({ create: err.message || 'Failed' }); } finally { setCreating(false); }
  };

  const STEPS = [
    <StepBasics config={config} setConfig={setConfig} namespaces={namespaces} onCreateNamespace={() => setShowCreateNs(true)} errors={errors} />,
    <StepConnections config={config} setConfig={setConfig} connections={connections} errors={errors} />,
    <StepTables config={config} setConfig={setConfig} sourceTables={sourceTables} targetTables={targetTables} loadingSourceTables={loadingSourceTables} loadingTargetTables={loadingTargetTables} errors={errors} />,
    <StepMapping />,
    <StepReview config={config} namespaces={namespaces} connections={connections} />,
  ];

  return (
    <div>
      <PageHeader title="Create new pipeline" />
      <div style={{ background: COLORS.background.primary, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.lg, paddingLeft: SPACING.xl, paddingRight: SPACING.xl, width: '75%', height: 'calc(90vh - 40px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
        <div>
          <div style={{ position: 'sticky', top: 0, background: COLORS.background.primary, zIndex: 1, paddingTop: SPACING.xxxl, paddingBottom: SPACING.md }}>
            <StepIndicator steps={WIZARD.steps} currentStep={step} />
          </div>
          <div style={{ minHeight: '300px' }}>{STEPS[step]}</div>
        </div>
        <div style={{ ...FRBC, paddingBottom: SPACING.lg, paddingTop: SPACING.md, borderTop: `1px solid ${COLORS.border.light}`, position: 'sticky', bottom: 0, background: COLORS.background.primary }}>
          <Button variant="secondary" onClick={() => step > 0 ? setStep(step - 1) : navigate('/pipelines')}>{step === 0 ? 'Cancel' : WIZARD.back}</Button>
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            {errors.create && <span style={{ fontSize: FONT.size.xs, color: COLORS.status.errorDark, marginRight: SPACING.xs }}>{errors.create}</span>}
            {step < STEPS.length - 1 ? <Button onClick={handleNext}>Next: {WIZARD.steps[step + 1]}</Button> : <Button onClick={handleCreate} style={creating ? { opacity: 0.6 } : {}}>{creating ? 'Creating...' : WIZARD.create}</Button>}
          </div>
        </div>
      </div>
      {showCreateNs && <CreateNamespaceModal onClose={() => setShowCreateNs(false)} onCreated={handleNamespaceCreated} />}
    </div>
  );
};

export default PipelineWizard;