import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
        subtitle="Orchestrate multiple validated pipelines in sequential series execution"
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

      {/* Workflows Table */}
      <div
        style={{
          background: COLORS.background.primary,
          border: `1px solid ${COLORS.border.light}`,
          borderRadius: BORDER_RADIUS.lg,
          boxShadow: SHADOWS.sm,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.text.secondary }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
            Loading workflows...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
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
              Chain multiple validated pipelines together to migrate parent and child tables in sequence.
            </p>
            {hasPermission('workflow:create') && (
              <Button variant="primary" onClick={() => navigate('/workflows/new')}>
                <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
                Create your first workflow
              </Button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: COLORS.background.secondary,
                  borderBottom: `1px solid ${COLORS.border.light}`,
                  textAlign: 'left',
                  fontSize: FONT.size.xs,
                  color: COLORS.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                <th style={{ padding: '12px 16px' }}>Workflow</th>
                <th style={{ padding: '12px 16px' }}>Pipeline Chain (Series Order)</th>
                <th style={{ padding: '12px 16px' }}>Topology</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', width: 150 }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wf) => {
                const chainNames = wf.orderedPipelineNames || [];
                const canRun = wf.singleChainReady && wf.status !== 'RUNNING';
                const isBusy = actionBusyId === wf.id;

                return (
                  <tr
                    key={wf.id}
                    onClick={() => navigate(`/workflows/${wf.id}/monitor`)}
                    style={{
                      borderBottom: `1px solid ${COLORS.border.light}`,
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = COLORS.background.secondary)
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div
                        style={{
                          fontSize: FONT.size.md,
                          fontWeight: FONT.weight.semibold,
                          color: COLORS.text.primary,
                        }}
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
                        <span>{wf.pipelineCount || 0} pipelines</span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {chainNames.length === 0 ? (
                        <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                          No pipelines added
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
                          {chainNames.map((pName, idx) => (
                            <React.Fragment key={`${wf.id}-p-${idx}`}>
                              <span
                                style={{
                                  fontSize: FONT.size.xs,
                                  fontWeight: FONT.weight.medium,
                                  padding: '3px 9px',
                                  borderRadius: BORDER_RADIUS.sm,
                                  background: COLORS.accent.purpleLight,
                                  color: COLORS.accent.purpleText,
                                }}
                              >
                                {pName}
                              </span>
                              {idx < chainNames.length - 1 && (
                                <i
                                  className="fa-solid fa-arrow-right"
                                  style={{ fontSize: 10, color: COLORS.text.tertiary }}
                                />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: FONT.size.xs,
                          fontWeight: FONT.weight.medium,
                          color: wf.singleChainReady
                            ? COLORS.status.successText
                            : COLORS.status.warningText,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <i
                          className={
                            wf.singleChainReady
                              ? 'fa-solid fa-check-circle'
                              : 'fa-solid fa-code-branch'
                          }
                        />
                        {wf.singleChainReady
                          ? '1 Connected Chain'
                          : `${wf.chainCount || 0} Chains`}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={wf.status} />
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <ProgressBar value={wf.progress || 0} status={wf.status} />
                    </td>

                    {/* <td
                      style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {wf.status === 'RUNNING' ? (
                          <>
                            {hasPermission('workflow:pause') && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isBusy}
                                onClick={(e) => handleAction(wf, 'PAUSE', e)}
                              >
                                <i className="fa-solid fa-pause" style={{ marginRight: 4 }} />
                                Pause
                              </Button>
                            )}
                            {hasPermission('workflow:stop') && (
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isBusy}
                                onClick={(e) => handleAction(wf, 'STOP', e)}
                              >
                                <i className="fa-solid fa-stop" style={{ marginRight: 4 }} />
                                Stop
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
                                <i className="fa-solid fa-play" style={{ marginRight: 4 }} />
                                Resume
                              </Button>
                            )}
                            {hasPermission('workflow:stop') && (
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isBusy}
                                onClick={(e) => handleAction(wf, 'STOP', e)}
                              >
                                <i className="fa-solid fa-stop" style={{ marginRight: 4 }} />
                                Stop
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
                              {wf.status === 'COMPLETED' || wf.status === 'FAILED' || wf.status === 'STOPPED'
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
                          >
                            <i className="fa-solid fa-pen-to-square" style={{ marginRight: 4 }} />
                            Edit
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
                    </td> */}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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
