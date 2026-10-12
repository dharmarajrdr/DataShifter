import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarLoader, Button, MetricCard, PageHeader, ProgressBar, SkeletonLoader, StatusBadge } from '../components/common';
import ApiGuard from '../components/common/ApiGuard';
import CreateNamespaceModal from '../components/pipeline/CreateNamespaceModal';
import ImportPipelineModal from '../components/pipeline/ImportPipelineModal';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS, SPACING } from '../constants/design';
import { FRBC, FRSC } from '../constants/layouts';
import { PIPELINE } from '../constants/literals';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { namespaceApi, pipelineApi } from '../services/api';
import { ForbiddenPage } from './ErrorPage';

/* ================================================================
   OWNER AVATAR
   ================================================================ */
const OwnerAvatar = ({ name, initials, color, size = 22 }) => (
  <div title={name || 'Unknown'}
    style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: color || COLORS.brand.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: FONT.weight.semibold, color: '#fff', cursor: 'default' }}>
    {initials || '?'}
  </div>
);

/* ================================================================
   PIPELINE CARD — Grid View (draggable across namespaces)
   ================================================================ */
const PipelineCard = ({ pipeline, navigate, onDragStart }) => {
  const getOwnerInitials = (name, existingInitials) => {
    if (existingInitials) return existingInitials;
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const progressVal =
    pipeline.progress >= 0 && pipeline.progress <= 100 ? pipeline.progress : 0;
  const formattedDate = pipeline.createdAt
    ? new Date(pipeline.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      draggable
      onClick={() => navigate(`/pipelines/${pipeline.id}/monitor`)}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', pipeline.id);
        onDragStart(pipeline.id);
        setTimeout(() => {
          e.target.style.opacity = '0.4';
        }, 0);
      }}
      onDragEnd={(e) => {
        e.target.style.opacity = '1';
      }}
      style={{
        background: COLORS.background.primary,
        border: `1px solid ${COLORS.border.light}`,
        borderRadius: BORDER_RADIUS.lg,
        boxShadow: SHADOWS.sm,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = COLORS.brand.primary;
        e.currentTarget.style.boxShadow = SHADOWS.md;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = COLORS.border.light;
        e.currentTarget.style.boxShadow = SHADOWS.sm;
      }}
    >
      {/* Top Section: Header, Source -> Target, Workflow Lock Badge */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: BORDER_RADIUS.md,
                background: COLORS.accent.purpleLight,
                color: COLORS.brand.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-arrow-right-arrow-left" style={{ fontSize: 14 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: FONT.size.md,
                  fontWeight: FONT.weight.semibold,
                  color: COLORS.text.primary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={pipeline.name}
              >
                {pipeline.name}
              </div>
              <div
                style={{
                  fontSize: FONT.size.xs,
                  color: COLORS.text.tertiary,
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{pipeline.namespaceName || 'Default'}</span>
                <span>·</span>
                <span>
                  {pipeline.tableCount || 0}{' '}
                  {(pipeline.tableCount || 0) === 1 ? 'table' : 'tables'}
                </span>
              </div>
            </div>
          </div>
          <StatusBadge status={pipeline.status} />
        </div>

        {/* Source -> Target Connection & Workflow Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: FONT.size.xs,
              color: COLORS.text.secondary,
              background: COLORS.background.secondary,
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.sm,
              padding: '4px 10px',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <span
              style={{
                fontWeight: FONT.weight.medium,
                color: COLORS.text.primary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pipeline.sourceName || pipeline.source || 'Source'}
            </span>
            <i
              className="fa-solid fa-arrow-right"
              style={{ fontSize: 10, color: COLORS.text.tertiary, flexShrink: 0 }}
            />
            <span
              style={{
                fontWeight: FONT.weight.medium,
                color: COLORS.text.primary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pipeline.targetName || pipeline.target || 'Target'}
            </span>
          </div>

          {pipeline.workflowId && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/workflows/${pipeline.workflowId}/monitor`);
              }}
              title={`Locked to workflow '${pipeline.workflowName}'. Click to view workflow.`}
              style={{
                fontSize: '11px',
                fontWeight: FONT.weight.medium,
                padding: '3px 9px',
                borderRadius: BORDER_RADIUS.pill,
                background: COLORS.accent.purpleLight,
                color: COLORS.accent.purpleText,
                border: `1px solid ${COLORS.brand.primary}`,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                maxWidth: '100%',
              }}
            >
              <i className="fa-solid fa-lock" style={{ fontSize: 10 }} />
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Workflow: {pipeline.workflowName || 'Linked'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Bottom Section: Progress & Owner */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: COLORS.text.secondary,
              marginBottom: 4,
            }}
          >
            <span>Execution Progress</span>
            <span style={{ fontWeight: FONT.weight.medium }}>
              {Math.round(progressVal)}%
            </span>
          </div>
          <ProgressBar value={progressVal} status={pipeline.status} showLabel={false} />
        </div>

        <div
          style={{
            paddingTop: 10,
            borderTop: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: FONT.size.xs,
              color: COLORS.text.secondary,
              minWidth: 0,
            }}
          >
            <OwnerAvatar
              name={pipeline.ownerName}
              initials={getOwnerInitials(pipeline.ownerName, pipeline.ownerInitials)}
              color={pipeline.ownerColor}
            />
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pipeline.ownerName || 'Unknown'}
            </span>
          </div>
          {formattedDate && (
            <span
              style={{
                fontSize: FONT.size.xs,
                color: COLORS.text.tertiary,
                flexShrink: 0,
              }}
            >
              {formattedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   NAMESPACE GROUP
   ================================================================ */
const NamespaceGroup = ({ namespace, pipelines, navigate, onDragStart, onDropPipeline, dragOverNs, setDragOverNs }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isDropTarget = dragOverNs === namespace.id;
  return (
    <div style={{ marginBottom: SPACING.lg }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverNs(namespace.id); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverNs(null); }}
      onDrop={(e) => { e.preventDefault(); const pid = e.dataTransfer.getData('text/plain'); if (pid) onDropPipeline(pid, namespace.id, namespace.name); setDragOverNs(null); }}>
      <div style={{ ...FRBC, padding: `${SPACING.xs} ${SPACING.sm}`, cursor: 'pointer', marginBottom: collapsed ? 0 : SPACING.sm, borderRadius: BORDER_RADIUS.md, border: isDropTarget ? `2px dashed ${namespace.color || COLORS.brand.primary}` : '2px solid transparent', background: isDropTarget ? (namespace.color || COLORS.brand.primary) + '10' : 'transparent', transition: 'all 0.15s' }}>
        <div style={{ ...FRSC, gap: SPACING.xs }} onClick={() => setCollapsed(!collapsed)}>
          <span style={{ fontSize: '11px', color: COLORS.text.tertiary, width: '14px' }}><i className={collapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-down'} /></span>
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: SPACING.md,
            }}
          >
            {pipelines.map(p => <PipelineCard key={p.id} pipeline={p} navigate={navigate} onDragStart={onDragStart} />)}
          </div>
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
  const [showImportModal, setShowImportModal] = useState(false);
  const navigate = useNavigate();
  const notification = useNotification();
  const { user, hasPermission } = useAuth();
  const canViewPipeline = hasPermission('pipeline:view');
  const canCreatePipeline = hasPermission('pipeline:create');
  const canCreateNamespace = hasPermission('namespace:create');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (!canViewPipeline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pRes, nRes] = await Promise.all([pipelineApi.getAll(), namespaceApi.getAll()]);
      setPipelines(pRes.data || []);
      setNamespaces(nRes.data || []);
    } catch (e) { setError(e); } finally { setLoading(false); }
  }, [canViewPipeline]);

  useEffect(() => {
    fetchAllData();
  }, [user?.orgId, fetchAllData]);

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

  if (!canViewPipeline) {
    return (
      <ForbiddenPage
        missingPermission="pipeline:view"
        message="You don't have permission to view pipelines."
      />
    );
  }

  return (
    <ApiGuard
      error={error}
      loading={loading}
      loadingComponent={
        <div>
          <BarLoader />
          <div style={{ marginTop: SPACING.lg }}>
            <SkeletonLoader variant="table-row" count={5} style={{ marginBottom: SPACING.sm }} />
          </div>
        </div>
      }
    >
      <div>
        <PageHeader
          title={PIPELINE.title}
          subtitle={PIPELINE.subtitle}
          actions={
            <div style={{ ...FRSC, gap: SPACING.sm }}>
              <Button
                variant="secondary"
                onClick={() => setShowImportModal(true)}
                disabled={!canCreatePipeline}
                title={!canCreatePipeline ? 'You do not have permission to import pipelines' : undefined}
              >
                Import Pipeline
              </Button>
              <Button
                onClick={() => navigate('/pipelines/new')}
                disabled={!canCreatePipeline}
                title={!canCreatePipeline ? 'You do not have permission to create pipelines' : undefined}
              >
                {PIPELINE.newPipeline}
              </Button>
            </div>
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
            />
          ))
        )}
        {showCreateNs && <CreateNamespaceModal onClose={() => setShowCreateNs(false)} onCreated={(ns) => setNamespaces(prev => [...prev, ns])} />}

        {showImportModal && (
          <ImportPipelineModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImportSuccess={() => fetchAllData()}
          />
        )}
      </div>
    </ApiGuard>
  );
};

export default PipelineDashboard;