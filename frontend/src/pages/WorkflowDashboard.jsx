import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiGuard,
  Button,
  ConfirmationModal,
  MetricCard,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from '../components/common';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS, SPACING } from '../constants/design';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { useEventSource } from '../hooks/useEventSource';
import { namespaceApi, workflowApi } from '../services/api';

const WorkflowDashboard = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const { user, hasPermission } = useAuth();

  const [workflows, setWorkflows] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const [wfRes, nsRes] = await Promise.all([
        workflowApi.getAll(),
        namespaceApi.getAll().catch(() => ({ data: [] })),
      ]);
      setWorkflows(wfRes.data || []);
      setNamespaces(nsRes.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [user?.orgId, loadDashboard]);

  // Subscribe to SSE for org-wide workflow status updates when any workflow is active
  const sseChannels = useMemo(() => {
    const ch = [];
    if (user?.orgId) ch.push(`org:${user.orgId}`);
    workflows.forEach((w) => {
      if (w.status === 'RUNNING' || w.status === 'PAUSED') {
        ch.push(`workflow:${w.id}`);
      }
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
      setWorkflows((prev) =>
        prev.map((w) => {
          if (w.id !== d.workflowId) return w;
          const statuses = d.pipelineStatuses || {};
          const completedSteps = Object.values(statuses).filter(
            (s) => s === 'COMPLETED'
          ).length;
          const totalSteps = w.pipelineCount || 1;
          const overallProgress =
            d.status === 'COMPLETED'
              ? 100
              : Math.min(100, Math.round((completedSteps / totalSteps) * 1000) / 10);
          return {
            ...w,
            status: d.status || w.status,
            currentPipelineId:
              d.currentPipelineId !== undefined ? d.currentPipelineId : w.currentPipelineId,
            overallProgress,
          };
        })
      );
      if (d.status === 'COMPLETED' || d.status === 'FAILED' || d.status === 'STOPPED') {
        loadDashboard();
      }
    },
  });

  const handleAction = async (wf, action, e) => {
    e.stopPropagation();
    setActionBusyId(wf.id);
    try {
      await workflowApi.performAction(wf.id, action);
      notify.success(`Workflow ${action.toLowerCase()} triggered`);
      await loadDashboard();
    } catch (err) {
      notify.error(err.message || `Failed to ${action.toLowerCase()} workflow`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await workflowApi.delete(deleteTarget.id);
      notify.success(`Workflow '${deleteTarget.name}' deleted`);
      setDeleteTarget(null);
      loadDashboard();
    } catch (err) {
      notify.error(err.message || 'Failed to delete workflow');
    }
  };

  const filtered = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.orderedPipelineNames || []).some((p) =>
        p.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesNs =
      selectedNamespace === 'ALL' ||
      (selectedNamespace === 'DEFAULT' ? !w.namespaceId : w.namespaceId === selectedNamespace);
    return matchesSearch && matchesNs;
  });

  const totalCount = workflows.length;
  const readyCount = workflows.filter((w) => w.status === 'READY' || w.singleChainReady).length;
  const runningCount = workflows.filter((w) => w.status === 'RUNNING').length;
  const failedCount = workflows.filter((w) => w.status === 'FAILED' || w.status === 'ERRORED').length;

  return (
    <ApiGuard error={error} loading={loading} onRetry={loadDashboard}>
      <div>
        <PageHeader
          title="Workflows"
          subtitle="Orchestrate multiple validated pipelines in series and parallel execution"
          actions={
            hasPermission('workflow:create') && (
              <Button variant="primary" onClick={() => navigate('/workflows/new')}>
                <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
                New workflow
              </Button>
            )
          }
        />

        {/* KPI Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: SPACING.md,
            marginBottom: SPACING.xl,
          }}
        >
          <MetricCard label="Total workflows" value={totalCount} />
          <MetricCard label="Ready (Single Chain)" value={readyCount} color={COLORS.status.info} />
          <MetricCard label="Running" value={runningCount} color={COLORS.status.success} />
          <MetricCard label="Failed" value={failedCount} color={COLORS.status.error} />
        </div>

        {/* Filters & Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: SPACING.md,
            marginBottom: SPACING.md,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', name: 'All Namespaces' },
              { id: 'DEFAULT', name: 'Default' },
              ...namespaces,
            ].map((ns) => {
              const active = selectedNamespace === ns.id;
              return (
                <button
                  key={ns.id}
                  type="button"
                  onClick={() => setSelectedNamespace(ns.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: BORDER_RADIUS.pill,
                    border: active
                      ? `1px solid ${COLORS.brand.primary}`
                      : `1px solid ${COLORS.border.light}`,
                    background: active ? COLORS.accent.purpleLight : COLORS.background.primary,
                    color: active ? COLORS.accent.purpleText : COLORS.text.secondary,
                    fontSize: FONT.size.xs,
                    fontWeight: active ? FONT.weight.semibold : FONT.weight.regular,
                    cursor: 'pointer',
                  }}
                >
                  {ns.name}
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', minWidth: 260 }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 12,
                color: COLORS.text.tertiary,
              }}
            />
            <input
              type="text"
              placeholder="Search workflows or member pipelines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.border.light}`,
                fontSize: FONT.size.sm,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Workflows Grid View */}
        {loading ? (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: COLORS.text.secondary,
              background: COLORS.background.primary,
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.lg,
              boxShadow: SHADOWS.sm,
            }}
          >
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
            Loading workflows...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 56,
              textAlign: 'center',
              background: COLORS.background.primary,
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.lg,
              boxShadow: SHADOWS.sm,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: COLORS.accent.purpleLight,
                color: COLORS.brand.primary,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <i className="fa-solid fa-diagram-project" style={{ fontSize: 20 }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: FONT.size.lg, color: COLORS.text.primary }}>
              No workflows found
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: FONT.size.sm, color: COLORS.text.secondary }}>
              Chain multiple validated pipelines together in series or parallel to orchestrate data migrations.
            </p>
            {hasPermission('workflow:create') && (
              <Button variant="primary" onClick={() => navigate('/workflows/new')}>
                <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
                Create your first workflow
              </Button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: SPACING.md,
            }}
          >
            {filtered.map((wf) => {
              const chainNames = wf.orderedPipelineNames || [];
              const canRun = wf.singleChainReady && wf.status !== 'RUNNING';
              const isBusy = actionBusyId === wf.id;
              const progressVal = wf.overallProgress ?? wf.progress ?? 0;
              const updatedDate = wf.updatedAt || wf.createdAt;
              const formattedDate = updatedDate
                ? new Date(updatedDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;

              return (
                <div
                  key={wf.id}
                  onClick={() => navigate(`/workflows/${wf.id}/monitor`)}
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
                  {/* Top Section: Header, Description, Badges */}
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
                          <i className="fa-solid fa-diagram-project" style={{ fontSize: 15 }} />
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
                            title={wf.name}
                          >
                            {wf.name}
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
                            <span>{wf.namespaceName || 'Default'}</span>
                            <span>·</span>
                            <span>
                              {wf.pipelineCount || 0}{' '}
                              {(wf.pipelineCount || 0) === 1 ? 'pipeline' : 'pipelines'}
                            </span>
                            {wf.chainCount > 1 && (
                              <>
                                <span>·</span>
                                <span style={{ color: COLORS.status.warningText }}>
                                  {wf.chainCount} chains
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={wf.status} />
                    </div>

                    {wf.description && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: FONT.size.xs,
                          color: COLORS.text.secondary,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {wf.description}
                      </p>
                    )}

                    {/* Member Pipeline Steps Preview */}
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: BORDER_RADIUS.md,
                        background: COLORS.background.secondary,
                        border: `1px solid ${COLORS.border.light}`,
                        minHeight: 42,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {chainNames.length === 0 ? (
                        <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                          <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
                          No pipelines linked yet
                        </span>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          {chainNames.slice(0, 4).map((pName, idx) => (
                            <span
                              key={`${wf.id}-p-${idx}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: FONT.weight.medium,
                                  padding: '2px 8px',
                                  borderRadius: BORDER_RADIUS.sm,
                                  background: COLORS.background.primary,
                                  border: `1px solid ${COLORS.border.medium}`,
                                  color: COLORS.text.primary,
                                  maxWidth: 150,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={pName}
                              >
                                {pName}
                              </span>
                              {idx < Math.min(chainNames.length, 4) - 1 && (
                                <i
                                  className="fa-solid fa-arrow-right"
                                  style={{ fontSize: 9, color: COLORS.text.tertiary }}
                                />
                              )}
                            </span>
                          ))}
                          {chainNames.length > 4 && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: FONT.weight.semibold,
                                color: COLORS.brand.primary,
                                background: COLORS.accent.purpleLight,
                                padding: '2px 7px',
                                borderRadius: BORDER_RADIUS.pill,
                              }}
                            >
                              +{chainNames.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Section: Progress, Owner & Quick Actions */}
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
                          {wf.singleChainReady ? 'Single Chain Ready' : 'Draft Topology'}
                        </span>
                      </div>
                      <ProgressBar value={progressVal} status={wf.status} />
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
                        <div
                          title={wf.ownerName || 'Owner'}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: wf.ownerColor || COLORS.brand.primary,
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: FONT.weight.semibold,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {wf.ownerInitials || 'U'}
                        </div>
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {wf.ownerName || 'Unknown'}
                        </span>
                        {formattedDate && (
                          <>
                            <span style={{ color: COLORS.text.tertiary }}>·</span>
                            <span style={{ color: COLORS.text.tertiary, flexShrink: 0 }}>
                              {formattedDate}
                            </span>
                          </>
                        )}
                      </div>

                      <div
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {wf.status === 'RUNNING' ? (
                          <>
                            {hasPermission('workflow:pause') && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isBusy}
                                onClick={(e) => handleAction(wf, 'PAUSE', e)}
                              >
                                <i className="fa-solid fa-pause" />
                              </Button>
                            )}
                            {hasPermission('workflow:stop') && (
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isBusy}
                                onClick={(e) => handleAction(wf, 'STOP', e)}
                              >
                                <i className="fa-solid fa-stop" />
                              </Button>
                            )}
                          </>
                        ) : wf.status === 'PAUSED' ? (
                          <>
                            {hasPermission('workflow:run') && (
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={isBusy}
                                onClick={(e) => handleAction(wf, 'RESUME', e)}
                              >
                                <i className="fa-solid fa-play" />
                              </Button>
                            )}
                            {hasPermission('workflow:stop') && (
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isBusy}
                                onClick={(e) => handleAction(wf, 'STOP', e)}
                              >
                                <i className="fa-solid fa-stop" />
                              </Button>
                            )}
                          </>
                        ) : (
                          hasPermission('workflow:run') && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={!canRun || isBusy}
                              title={
                                canRun
                                  ? 'Start workflow execution'
                                  : 'Workflow must have 1 connected chain of VALIDATED pipelines before running'
                              }
                              onClick={(e) => handleAction(wf, 'START', e)}
                            >
                              <i className="fa-solid fa-play" style={{ marginRight: 4 }} />
                              {wf.status === 'COMPLETED' ||
                              wf.status === 'FAILED' ||
                              wf.status === 'STOPPED'
                                ? 'Re-Run'
                                : 'Run'}
                            </Button>
                          )
                        )}

                        {hasPermission('workflow:edit') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={wf.status === 'RUNNING' || wf.status === 'PAUSED'}
                            onClick={() => navigate(`/workflows/${wf.id}/edit`)}
                            title="Edit workflow"
                          >
                            <i className="fa-solid fa-pen-to-square" />
                          </Button>
                        )}

                        {hasPermission('workflow:delete') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={wf.status === 'RUNNING' || wf.status === 'PAUSED'}
                            onClick={() => setDeleteTarget(wf)}
                            title="Delete workflow"
                          >
                            <i
                              className="fa-solid fa-trash"
                              style={{ color: COLORS.status.error }}
                            />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmationModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete Workflow"
          message={
            deleteTarget
              ? `Are you sure you want to delete workflow '${deleteTarget.name}'? All pipelines inside this workflow will be unlocked for standalone execution, and the pipelines themselves will NOT be deleted.`
              : ''
          }
          variant="danger"
          actions={[
            { label: 'Cancel', variant: 'secondary', onClick: () => setDeleteTarget(null) },
            { label: 'Delete Workflow', variant: 'danger', onClick: handleConfirmDelete },
          ]}
        />
      </div>
    </ApiGuard>
  );
};

export default WorkflowDashboard;
