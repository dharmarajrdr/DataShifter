import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { FRSC, FRBC } from '../constants/layouts';
import { PIPELINE } from '../constants/literals';
import { PageHeader, MetricCard, StatusBadge, ProgressBar, Button, Loader } from '../components/common';
import CreateNamespaceModal from '../components/pipeline/CreateNamespaceModal';
import { pipelineApi, namespaceApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ApiGuard from '../components/common/ApiGuard';

/* ================================================================
   OWNER AVATAR
   ================================================================ */
const OwnerAvatar = ({ name, initials, color, size = 24 }) => (
  <div title={name || 'Unknown'}
    style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: color || COLORS.brand.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.42), fontWeight: 500, color: '#fff', cursor: 'default' }}>
    {initials || '?'}
  </div>
);

/* ================================================================
   KEBAB MENU (three-dot) — renders dropdown on click
   ================================================================ */
const KebabMenu = ({ pipeline, navigate, onDelete, canDelete, canEditSettings }) => {
  const [open, setOpen] = useState(false);

  const items = [
    { label: 'Monitor', icon: '📊', onClick: () => navigate(`/pipelines/${pipeline.id}/monitor`) },
    { label: 'Column mapping', icon: '🔗', onClick: () => navigate(`/pipelines/${pipeline.id}/mapping`) },
    {
      label: 'Settings',
      icon: '⚙',
      disabled: !canEditSettings,
      tooltip: !canEditSettings ? 'You do not have permission to edit pipeline settings' : '',
      onClick: () => navigate(`/pipelines/${pipeline.id}/settings`)
    },
  ];

  if (canDelete) {
    items.push({ type: 'divider' });
    items.push({
      label: 'Delete', icon: '🗑', danger: true, onClick: () => {
        if (window.confirm(`Delete pipeline "${pipeline.name}"? This cannot be undone.`)) {
          onDelete(pipeline.id);
        }
      }
    });
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ width: 28, height: 28, borderRadius: BORDER_RADIUS.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: open ? COLORS.background.secondary : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = COLORS.background.secondary; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3.5" r="1.2" fill={COLORS.text.tertiary} />
          <circle cx="8" cy="8" r="1.2" fill={COLORS.text.tertiary} />
          <circle cx="8" cy="12.5" r="1.2" fill={COLORS.text.tertiary} />
        </svg>
      </div>

      {open && (
        <>
          {/* Backdrop to close menu */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
          {/* Menu dropdown */}
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 100,
            background: COLORS.background.primary, border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.md, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            minWidth: '160px', overflow: 'hidden',
          }}>
            {items.map((item, i) => {
              if (item.type === 'divider') {
                return <div key={`d-${i}`} style={{ height: '1px', background: COLORS.border.light, margin: '4px 0' }} />;
              }
              const disabled = item.disabled;
              return (
                <div key={item.label}
                  title={item.tooltip || ''}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (disabled) return;
                    setOpen(false);
                    item.onClick();
                  }}
                  style={{
                    ...FRSC, gap: '8px', padding: '8px 12px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: FONT.size.xs,
                    color: disabled ? COLORS.text.tertiary : (item.danger ? COLORS.status.errorDark : COLORS.text.primary),
                    opacity: disabled ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = item.danger ? COLORS.status.errorLight : COLORS.background.secondary; }}
                  onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ fontSize: '12px', width: '18px', textAlign: 'center' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

/* ================================================================
   PIPELINE ROW — draggable, with kebab menu
   ================================================================ */
const PipelineRow = ({ pipeline, navigate, onDragStart, onDelete, canDelete, canEditSettings }) => {
  const getOwnerInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return <div draggable
    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', pipeline.id); onDragStart(pipeline.id); setTimeout(() => { e.target.style.opacity = '0.4'; }, 0); }}
    onDragEnd={(e) => { e.target.style.opacity = '1'; }}
    style={{ background: COLORS.background.primary, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, padding: `${SPACING.sm} ${SPACING.md}`, marginBottom: SPACING.xs, cursor: 'grab', userSelect: 'none' }}>
    <div style={{ ...FRBC }}>
      <div style={{ ...FRSC, gap: SPACING.sm, flex: 1, minWidth: 0 }}>
        <OwnerAvatar name={pipeline.ownerName} initials={getOwnerInitials(pipeline.ownerName)} color={pipeline.ownerColor} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p onClick={() => navigate(`/pipelines/${pipeline.id}/monitor`)}
            style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, cursor: 'pointer', color: COLORS.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}
            onMouseEnter={e => e.target.style.color = COLORS.brand.primary}
            onMouseLeave={e => e.target.style.color = COLORS.text.primary}>
            {pipeline.name}
          </p>
          <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px', margin: 0 }}>
            {pipeline.sourceName || pipeline.source} → {pipeline.targetName || pipeline.target} · {pipeline.tableCount} tables
            {pipeline.ownerName && <span style={{ color: COLORS.text.tertiary }}> · {pipeline.ownerName}</span>}
          </p>
        </div>
      </div>
      <div style={{ ...FRSC, gap: SPACING.sm, flexShrink: 0 }}>
        <StatusBadge status={pipeline.status} />
        {pipeline.progress >= 0 && pipeline.progress <= 100 && (
          <div style={{ width: 120 }}>
            <ProgressBar progress={pipeline.progress} height="4px" showLabel={true} />
          </div>
        )}
        <KebabMenu pipeline={pipeline} navigate={navigate} onDelete={onDelete} canDelete={canDelete} canEditSettings={canEditSettings} />
      </div>
    </div>
  </div>
};

/* ================================================================
   NAMESPACE GROUP
   ================================================================ */
const NamespaceGroup = ({ namespace, pipelines, navigate, onDragStart, onDropPipeline, dragOverNs, setDragOverNs, onDelete, canDelete, canEditSettings }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isDropTarget = dragOverNs === namespace.id;
  return (
    <div style={{ marginBottom: SPACING.md }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverNs(namespace.id); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverNs(null); }}
      onDrop={(e) => { e.preventDefault(); const pid = e.dataTransfer.getData('text/plain'); if (pid) onDropPipeline(pid, namespace.id, namespace.name); setDragOverNs(null); }}>
      <div style={{ ...FRBC, padding: `${SPACING.xs} ${SPACING.sm}`, cursor: 'pointer', marginBottom: collapsed ? 0 : SPACING.xs, borderRadius: BORDER_RADIUS.md, border: isDropTarget ? `2px dashed ${namespace.color || COLORS.brand.primary}` : '2px solid transparent', background: isDropTarget ? (namespace.color || COLORS.brand.primary) + '10' : 'transparent', transition: 'all 0.15s' }}>
        <div style={{ ...FRSC, gap: SPACING.xs }} onClick={() => setCollapsed(!collapsed)}>
          <span style={{ fontSize: '11px', color: COLORS.text.tertiary, width: '14px' }}>{collapsed ? '▶' : '▼'}</span>
          <div style={{ width: 10, height: 10, borderRadius: '2px', background: namespace.color || COLORS.brand.primary, flexShrink: 0 }} />
          <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, color: COLORS.text.primary }}>{namespace.name}</span>
          <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, background: COLORS.background.secondary, padding: '1px 8px', borderRadius: BORDER_RADIUS.pill }}>{pipelines.length}</span>
        </div>
        {isDropTarget && <span style={{ fontSize: FONT.size.xs, color: namespace.color || COLORS.brand.primary, fontWeight: FONT.weight.medium }}>Drop here</span>}
      </div>
      {!collapsed && (
        <div style={{ paddingLeft: '24px', minHeight: isDropTarget ? '40px' : 'auto' }}>
          {pipelines.length === 0 && isDropTarget && (
            <div style={{ padding: SPACING.sm, textAlign: 'center', color: COLORS.text.tertiary, fontSize: FONT.size.xs, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.md }}>
              Drop pipeline here
            </div>
          )}
          {pipelines.map(p => <PipelineRow key={p.id} pipeline={p} navigate={navigate} onDragStart={onDragStart} onDelete={onDelete} canDelete={canDelete} canEditSettings={canEditSettings} />)}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   MAIN PAGE
   ================================================================ */
const PipelineDashboard = () => {
  const [pipelines, setPipelines] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedNamespaces, setSelectedNamespaces] = useState([]);
  const [dragOverNs, setDragOverNs] = useState(null);
  const [draggingPipelineId, setDraggingPipelineId] = useState(null);
  const [showCreateNs, setShowCreateNs] = useState(false);
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const canCreatePipeline = hasPermission('pipeline:create');
  const canCreateNamespace = hasPermission('namespace:create');
  const canDeletePipeline = hasPermission('pipeline:delete');
  const canEditSettings = hasPermission('settings:edit');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRes, nRes] = await Promise.all([pipelineApi.getAll(), namespaceApi.getAll()]);
        setPipelines(pRes.data || []);
        setNamespaces(nRes.data || []);
      } catch (e) { setError(e); } finally { setLoading(false); }
    })();
  }, [user?.orgId]);

  const filteredPipelines = useMemo(() => {
    let r = pipelines;
    if (selectedNamespaces.length > 0) r = r.filter(p => selectedNamespaces.includes(p.namespaceId));
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(p => p.name.toLowerCase().includes(q) || (p.sourceName || '').toLowerCase().includes(q) || (p.targetName || '').toLowerCase().includes(q) || (p.status || '').toLowerCase().includes(q) || (p.namespaceName || '').toLowerCase().includes(q)); }
    return r;
  }, [pipelines, search, selectedNamespaces]);

  const groupedPipelines = useMemo(() => {
    const groups = {};
    for (const ns of namespaces) groups[ns.id] = [];
    for (const p of filteredPipelines) { const nsId = p.namespaceId || 'ns-default'; if (!groups[nsId]) groups[nsId] = []; groups[nsId].push(p); }
    return Object.keys(groups).sort((a, b) => { if (a === 'ns-default') return 1; if (b === 'ns-default') return -1; return (namespaces.find(n => n.id === a)?.name || '').localeCompare(namespaces.find(n => n.id === b)?.name || ''); }).map(nsId => ({
      namespace: namespaces.find(n => n.id === nsId) || { id: nsId, name: 'Default', color: '#888780' },
      pipelines: groups[nsId],
    }));
  }, [filteredPipelines, namespaces]);

  const handleDropPipeline = useCallback(async (pipelineId, namespaceId, namespaceName) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline || pipeline.namespaceId === namespaceId) return;
    setPipelines(prev => prev.map(p => p.id === pipelineId ? { ...p, namespaceId, namespaceName } : p));
    try { await namespaceApi.movePipeline(pipelineId, namespaceId); } catch (e) {
      setPipelines(prev => prev.map(p => p.id === pipelineId ? { ...p, namespaceId: pipeline.namespaceId, namespaceName: pipeline.namespaceName } : p));
    }
    setDraggingPipelineId(null);
  }, [pipelines]);

  const handleDelete = useCallback(async (id) => {
    if (!canDeletePipeline) return;
    setPipelines(prev => prev.filter(p => p.id !== id));
    try { await pipelineApi.delete(id); } catch (e) {
      // Revert — re-fetch
      const res = await pipelineApi.getAll();
      setPipelines(res.data || []);
    }
  }, [canDeletePipeline]);

  const toggleNamespace = (nsId) => setSelectedNamespaces(prev => prev.includes(nsId) ? prev.filter(id => id !== nsId) : [...prev, nsId]);
  const counts = { total: pipelines.length, running: pipelines.filter(p => p.status === 'RUNNING').length, errored: pipelines.filter(p => p.status === 'ERRORED').length, completed: pipelines.filter(p => p.status === 'COMPLETED').length };

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<Loader variant="line" />}>
      <div>
        <PageHeader
          title={PIPELINE.title}
          subtitle={PIPELINE.subtitle}
          actions={
            <Button
              onClick={() => navigate('/pipelines/new')}
              disabled={!canCreatePipeline}
              title={!canCreatePipeline ? 'You do not have permission to create pipelines' : undefined}
            >
              {PIPELINE.newPipeline}
            </Button>
          }
        />
        <div style={{ ...FRSC, gap: SPACING.sm, marginBottom: SPACING.lg }}>
          <MetricCard label="Total pipelines" value={counts.total} />
          <MetricCard label="Running" value={counts.running} color={COLORS.status.success} />
          <MetricCard label="Errored" value={counts.errored} color={COLORS.status.errorDark} />
          <MetricCard label="Completed" value={counts.completed} color={COLORS.brand.primary} />
        </div>
        <div style={{ marginBottom: SPACING.sm }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, source, target, status..."
            style={{ width: '100%', padding: `${SPACING.xs} ${SPACING.md}`, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box', background: COLORS.background.primary }} />
        </div>
        {namespaces.length > 0 && (
          <div style={{ ...FRSC, gap: '6px', marginBottom: SPACING.md, flexWrap: 'wrap' }}>
            <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginRight: '2px' }}>Namespaces:</span>
            {namespaces.map(ns => {
              const isSel = selectedNamespaces.includes(ns.id);
              return <span key={ns.id} onClick={() => toggleNamespace(ns.id)} style={{ fontSize: FONT.size.xs, padding: '3px 12px', borderRadius: BORDER_RADIUS.pill, cursor: 'pointer', fontWeight: isSel ? FONT.weight.medium : FONT.weight.regular, background: isSel ? ns.color + '20' : COLORS.background.secondary, color: isSel ? ns.color : COLORS.text.secondary, border: isSel ? `1.5px solid ${ns.color}` : `1px solid ${COLORS.border.light}` }}>{ns.name} ({ns.pipelineCount})</span>;
            })}
            {canCreateNamespace && (
              <span onClick={() => setShowCreateNs(true)} title="Create namespace"
                style={{ fontSize: FONT.size.xs, padding: '3px 10px', borderRadius: BORDER_RADIUS.pill, cursor: 'pointer', fontWeight: FONT.weight.medium, background: COLORS.background.secondary, color: COLORS.brand.primary, border: `1px dashed ${COLORS.brand.primary}`, display: 'flex', alignItems: 'center', gap: '3px' }}
                onMouseEnter={e => { e.currentTarget.style.background = COLORS.accent.purpleLight; }}
                onMouseLeave={e => { e.currentTarget.style.background = COLORS.background.secondary; }}>
                <span style={{ fontSize: '13px', lineHeight: 1 }}>+</span>
              </span>
            )}
            {selectedNamespaces.length > 0 && <span onClick={() => setSelectedNamespaces([])} style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px' }}>Clear</span>}
          </div>
        )}
        {filteredPipelines.length === 0 && !draggingPipelineId ? (
          <div style={{ padding: '40px', textAlign: 'center', color: COLORS.text.tertiary, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.lg }}>
            {search || selectedNamespaces.length > 0 ? 'No pipelines match your search' : 'No pipelines yet. Create your first pipeline to get started.'}
          </div>
        ) : (
          groupedPipelines.map(g => (
            <NamespaceGroup
              key={g.namespace.id}
              namespace={g.namespace}
              pipelines={g.pipelines}
              navigate={navigate}
              onDragStart={setDraggingPipelineId}
              onDropPipeline={handleDropPipeline}
              dragOverNs={dragOverNs}
              setDragOverNs={setDragOverNs}
              onDelete={handleDelete}
              canDelete={canDeletePipeline}
              canEditSettings={canEditSettings}
            />
          ))
        )}
        {showCreateNs && <CreateNamespaceModal onClose={() => setShowCreateNs(false)} onCreated={(ns) => setNamespaces(prev => [...prev, ns])} />}
      </div>
    </ApiGuard>
  );
};

export default PipelineDashboard;