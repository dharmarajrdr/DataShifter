import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ApiGuard,
  Button,
  MetricCard,
  ProgressBar,
  StatusBadge,
} from '../components/common';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS, SPACING } from '../constants/design';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { useEventSource } from '../hooks/useEventSource';
import { workflowApi } from '../services/api';
import { computeClientTopology } from './WorkflowBuilderPage';

const WorkflowMonitor = () => {
  const { workflowId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();
  const { hasPermission } = useAuth();

  const initialTab = location.pathname.endsWith('/errors') ? 'errors' : 'chain';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState('__TRIGGER__');
  const [updateCount, setUpdateCount] = useState(0);

  // Aggregated error logs state
  const [errorSummary, setErrorSummary] = useState({
    totalErrors: 0,
    errorsByType: [],
    errors: [],
  });
  const [errorFilterPipelineId, setErrorFilterPipelineId] = useState('');
  const [errorFilterType, setErrorFilterType] = useState('');
  const [errorSearch, setErrorSearch] = useState('');
  const [expandedErrorId, setExpandedErrorId] = useState(null);
  const [reRunModalOpen, setReRunModalOpen] = useState(false);
  const [selectedReRunMode, setSelectedReRunMode] = useState('RERUN_FAILED_STAGE');

  const fetchWorkflow = useCallback(async () => {
    try {
      setError(null);
      const res = await workflowApi.getById(workflowId);
      if (res.data) {
        setWorkflow(res.data);
        setSelectedPipelineId(
          (prev) => prev || res.data.currentPipelineId || '__TRIGGER__'
        );
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await workflowApi.getErrors(workflowId, 0, 50, errorFilterPipelineId);
      if (res.data) {
        setErrorSummary({
          totalErrors: res.data.totalErrors || 0,
          errorsByType: res.data.errorsByType || [],
          errors: res.data.errors || [],
        });
      }
    } catch (_) {
      // Ignore error log fetch failure silently
    }
  }, [workflowId, errorFilterPipelineId]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  // Real-time SSE channels: workflow:{workflowId} + member pipeline channels
  const sseChannels = useMemo(() => {
    const ch = [`workflow:${workflowId}`];
    (workflow?.nodes || []).forEach((n) => {
      if (n.pipelineId) ch.push(`pipeline:${n.pipelineId}`);
    });
    return ch;
  }, [workflowId, workflow?.nodes]);

  const sseEnabled = Boolean(
    workflow && (workflow.status === 'RUNNING' || workflow.status === 'PAUSED')
  );

  const { connected, reconnectCount, exhausted, retry } = useEventSource({
    channels: sseChannels,
    enabled: sseEnabled,
    onProgress: (ev) => {
      const d = ev?.payload;
      if (!d || !d.pipelineId) return;
      setUpdateCount((c) => c + 1);
      setWorkflow((prev) => {
        if (!prev || !prev.nodes) return prev;
        const updatedNodes = prev.nodes.map((node) => {
          if (node.pipelineId !== d.pipelineId) return node;
          return {
            ...node,
            progress: d.overallProgress ?? node.progress ?? 0,
            rowsProcessed: d.totalRowsProcessed ?? node.rowsProcessed ?? 0,
            rowsPerSec: d.rowsPerSec ?? node.rowsPerSec ?? 0,
            eta: d.eta ?? node.eta,
            pipelineStatus: 'RUNNING',
          };
        });
        const totalNodes = updatedNodes.length || 1;
        const sumProgress = updatedNodes.reduce((acc, n) => {
          if (n.pipelineStatus === 'COMPLETED') {
            return acc + 100;
          }
          return acc + (Number(n.progress) || 0);
        }, 0);
        const overallProgress = Math.min(100, Math.round((sumProgress / totalNodes) * 10) / 10);
        const totalRowsProcessed = updatedNodes.reduce(
          (acc, n) => acc + (Number(n.rowsProcessed) || 0),
          0
        );
        return {
          ...prev,
          currentPipelineId: d.pipelineId,
          overallProgress,
          totalRowsProcessed,
          nodes: updatedNodes,
        };
      });
    },
    onStatusChange: (ev) => {
      const d = ev?.payload;
      if (!d) return;
      setUpdateCount((c) => c + 1);
      if (d.workflowId) {
        setWorkflow((prev) => {
          if (!prev) return prev;
          const statuses = d.pipelineStatuses || {};
          const updatedNodes = (prev.nodes || []).map((n) => {
            const pStatus = statuses[n.pipelineId] || n.pipelineStatus;
            return {
              ...n,
              pipelineStatus: pStatus,
              progress: pStatus === 'COMPLETED' ? 100 : n.progress,
            };
          });
          return {
            ...prev,
            status: d.status || prev.status,
            currentPipelineId:
              d.currentPipelineId !== undefined ? d.currentPipelineId : prev.currentPipelineId,
            overallProgress: d.status === 'COMPLETED' ? 100 : prev.overallProgress,
            nodes: updatedNodes,
          };
        });
        if (d.currentPipelineId) {
          setSelectedPipelineId(d.currentPipelineId);
        }
        fetchWorkflow();
        fetchErrors();
      } else if (d.pipelineId && d.newStatus) {
        setWorkflow((prev) => {
          if (!prev || !prev.nodes) return prev;
          const updatedNodes = prev.nodes.map((node) => {
            if (node.pipelineId !== d.pipelineId) return node;
            return {
              ...node,
              pipelineStatus: d.newStatus,
              progress: d.newStatus === 'COMPLETED' ? 100 : node.progress,
            };
          });
          return { ...prev, nodes: updatedNodes };
        });
        if (
          ['COMPLETED', 'ERRORED', 'VALIDATED', 'NOT_VALIDATED', 'INVALID', 'DRAFT'].includes(
            d.newStatus
          )
        ) {
          fetchWorkflow();
          fetchErrors();
        }
      }
    },
    onError: (ev) => {
      const d = ev?.payload;
      if (!d) return;
      setUpdateCount((c) => c + 1);
      setWorkflow((prev) => {
        if (!prev) return prev;
        const updatedNodes = (prev.nodes || []).map((n) =>
          n.pipelineId === d.pipelineId
            ? { ...n, errorsSkipped: (n.errorsSkipped || 0) + 1 }
            : n
        );
        return {
          ...prev,
          totalErrorsSkipped: (prev.totalErrorsSkipped || 0) + 1,
          nodes: updatedNodes,
        };
      });
      setErrorSummary((prev) => ({
        ...prev,
        totalErrors: (prev.totalErrors || 0) + 1,
      }));
      fetchErrors();
    },
  });

  const handleAction = async (action) => {
    setActionBusy(true);
    try {
      const res = await workflowApi.performAction(workflowId, action);
      if (res.data) {
        setWorkflow(res.data);
        if (res.data.currentPipelineId) {
          setSelectedPipelineId(res.data.currentPipelineId);
        }
      }
      notify.success(`Workflow ${action.toLowerCase()} command sent`);
    } catch (err) {
      notify.error(err.message || `Failed to ${action.toLowerCase()} workflow`);
    } finally {
      setActionBusy(false);
    }
  };

  const handleClearErrors = async () => {
    try {
      await workflowApi.clearErrors(workflowId);
      notify.success('Workflow error logs cleared');
      fetchErrors();
      fetchWorkflow();
    } catch (err) {
      notify.error(err.message || 'Failed to clear workflow error logs');
    }
  };

  if (error && !workflow) {
    return <ApiGuard error={error} loading={false} onRetry={fetchWorkflow} />;
  }

  if (loading && !workflow) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: COLORS.text.secondary }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
        Loading workflow monitor...
      </div>
    );
  }

  if (!workflow) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: COLORS.text.secondary }}>
        Workflow not found.
      </div>
    );
  }

  const rawNodes = workflow.nodes || [];
  const edges = workflow.edges || [];
  const clientTopo = computeClientTopology(rawNodes, edges);
  const nodes = clientTopo.orderedNodes.length > 0 ? clientTopo.orderedNodes : rawNodes;
  const completedSteps = nodes.filter((n) => n.pipelineStatus === 'COMPLETED').length;
  const allValidated =
    nodes.length >= 1 &&
    nodes.every((n) => !['DRAFT', 'NOT_VALIDATED', 'INVALID'].includes(n.pipelineStatus));
  const isSingleChainReady =
    Boolean(workflow.singleChainReady) && (workflow.chainCount || 0) === 1 && allValidated;
  const effectiveStatus =
    workflow.status === 'RUNNING' || workflow.status === 'PAUSED'
      ? workflow.status
      : !isSingleChainReady
        ? 'DRAFT'
        : workflow.status === 'DRAFT'
          ? 'READY'
          : workflow.status;
  const canStart = isSingleChainReady && effectiveStatus !== 'RUNNING';
  const isTriggerSelected = !selectedPipelineId || selectedPipelineId === '__TRIGGER__';
  const selectedNode = isTriggerSelected
    ? null
    : nodes.find((n) => n.pipelineId === selectedPipelineId) || null;

  const filteredErrors = (errorSummary.errors || []).filter((err) => {
    if (errorFilterType && err.errorType !== errorFilterType) return false;
    if (!errorSearch) return true;
    const q = errorSearch.toLowerCase();
    return (
      (err.errorMessage || '').toLowerCase().includes(q) ||
      (err.sourceTable || '').toLowerCase().includes(q) ||
      (err.targetTable || '').toLowerCase().includes(q) ||
      (err.pipelineName || '').toLowerCase().includes(q)
    );
  });

  const handleExportErrors = (format) => {
    if (!filteredErrors.length) return;
    const safeName = (workflow.name || 'workflow').replace(/[^a-zA-Z0-9_-]/g, '_');
    let content = '';
    let mime = 'text/plain;charset=utf-8';
    let ext = format;

    if (format === 'json') {
      content = JSON.stringify(filteredErrors, null, 2);
      mime = 'application/json;charset=utf-8';
    } else if (format === 'csv') {
      const headers = ['Pipeline', 'ErrorType', 'SourceTable', 'TargetTable', 'Chunk', 'Row', 'ErrorMessage', 'CreatedAt'];
      const rows = filteredErrors.map((e) =>
        [
          e.pipelineName || e.pipelineId || '',
          e.errorType || '',
          e.sourceTable || '',
          e.targetTable || '',
          e.chunkNumber ?? 0,
          e.rowNumber ?? 0,
          (e.errorMessage || '').replace(/"/g, '""'),
          e.createdAt || '',
        ]
          .map((v) => `"${v}"`)
          .join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mime = 'text/csv;charset=utf-8';
    } else {
      content = filteredErrors
        .map(
          (e) =>
            `[${e.createdAt || ''}] [${e.pipelineName || e.pipelineId}] [${e.errorType}] ${e.sourceTable} -> ${e.targetTable} (Chunk #${e.chunkNumber ?? 0}, Row #${e.rowNumber ?? 0}): ${e.errorMessage}`
        )
        .join('\n');
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_errors.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.lg,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/workflows')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: COLORS.text.secondary,
                padding: 4,
              }}
              title="Back to Workflows"
            >
              <i className="fa-solid fa-arrow-left" />
            </button>
            <h1
              style={{
                margin: 0,
                fontSize: FONT.size.xxl,
                fontWeight: FONT.weight.semibold,
                color: COLORS.text.primary,
              }}
            >
              {workflow.name}
            </h1>
            <StatusBadge status={effectiveStatus} />
          </div>
          <p
            style={{
              margin: '4px 0 0 28px',
              fontSize: FONT.size.sm,
              color: COLORS.text.secondary,
            }}
          >
            {workflow.description || 'Sequential pipeline workflow orchestration'}
          </p>
        </div>

        {/* Workflow Execution Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {effectiveStatus === 'RUNNING' ? (
            <>
              {hasPermission('workflow:pause') && (
                <Button
                  variant="secondary"
                  disabled={actionBusy}
                  onClick={() => handleAction('PAUSE')}
                >
                  <i className="fa-solid fa-pause" style={{ marginRight: 6 }} />
                  Pause Workflow
                </Button>
              )}
              {hasPermission('workflow:stop') && (
                <Button
                  variant="danger"
                  disabled={actionBusy}
                  onClick={() => handleAction('STOP')}
                >
                  <i className="fa-solid fa-stop" style={{ marginRight: 6 }} />
                  Stop Workflow
                </Button>
              )}
            </>
          ) : effectiveStatus === 'PAUSED' ? (
            <>
              {hasPermission('workflow:run') && (
                <Button
                  variant="primary"
                  disabled={actionBusy}
                  onClick={() => handleAction('RESUME')}
                >
                  <i className="fa-solid fa-play" style={{ marginRight: 6 }} />
                  Resume Workflow
                </Button>
              )}
              {hasPermission('workflow:stop') && (
                <Button
                  variant="danger"
                  disabled={actionBusy}
                  onClick={() => handleAction('STOP')}
                >
                  <i className="fa-solid fa-stop" style={{ marginRight: 6 }} />
                  Stop Workflow
                </Button>
              )}
            </>
          ) : (
            hasPermission('workflow:run') && (() => {
              const isReRun =
                effectiveStatus === 'COMPLETED' ||
                effectiveStatus === 'FAILED' ||
                effectiveStatus === 'STOPPED' ||
                nodes.some(
                  (n) => n.pipelineStatus === 'COMPLETED' || n.pipelineStatus === 'ERRORED'
                ) ||
                (workflow.totalRowsProcessed || 0) > 0;
              return (
                <Button
                  variant="primary"
                  disabled={!canStart || actionBusy}
                  onClick={() => {
                    if (isReRun) {
                      const hasFailedOrIncomplete = nodes.some(
                        (n) => n.pipelineStatus !== 'COMPLETED'
                      );
                      setSelectedReRunMode(
                        hasFailedOrIncomplete ? 'RERUN_FAILED_STAGE' : 'START'
                      );
                      setReRunModalOpen(true);
                    } else {
                      handleAction('START');
                    }
                  }}
                >
                  <i className="fa-solid fa-play" style={{ marginRight: 6 }} />
                  {isReRun ? 'Re-Run Workflow' : 'Start Workflow'}
                </Button>
              );
            })()
          )}

          {hasPermission('workflow:edit') && (
            <Button
              variant="secondary"
              disabled={effectiveStatus === 'RUNNING' || effectiveStatus === 'PAUSED'}
              onClick={() => navigate(`/workflows/${workflowId}/edit`)}
            >
              <i className="fa-solid fa-diagram-project" style={{ marginRight: 6 }} />
              Edit Chain
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: SPACING.md,
          marginBottom: SPACING.lg,
        }}
      >
        <MetricCard
          label="Overall Progress"
          value={`${workflow.overallProgress || 0}%`}
          color={COLORS.brand.primary}
        />
        <MetricCard
          label="Pipelines Completed"
          value={`${completedSteps} / ${nodes.length}`}
          color={COLORS.status.success}
        />
        <MetricCard
          label="Total Rows Migrated"
          value={(workflow.totalRowsProcessed || 0).toLocaleString()}
          color={COLORS.status.info}
        />
        <MetricCard
          label="Aggregated Errors"
          value={(errorSummary.totalErrors || workflow.totalErrorsSkipped || 0).toLocaleString()}
          color={COLORS.status.error}
        />
      </div>

      {/* View Switcher Tabs: Pipeline Chain vs Aggregated Error Logs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: `1px solid ${COLORS.border.light}`,
          marginBottom: SPACING.md,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('chain')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom:
              activeTab === 'chain'
                ? `2px solid ${COLORS.brand.primary}`
                : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'chain' ? COLORS.brand.primary : COLORS.text.secondary,
            fontSize: FONT.size.sm,
            fontWeight: FONT.weight.semibold,
            cursor: 'pointer',
          }}
        >
          <i className="fa-solid fa-diagram-project" style={{ marginRight: 6 }} />
          Pipeline Chain Execution ({nodes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('errors')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom:
              activeTab === 'errors'
                ? `2px solid ${COLORS.brand.primary}`
                : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'errors' ? COLORS.brand.primary : COLORS.text.secondary,
            fontSize: FONT.size.sm,
            fontWeight: FONT.weight.semibold,
            cursor: 'pointer',
          }}
        >
          <i className="fa-solid fa-bug" style={{ marginRight: 6 }} />
          Aggregated Error Logs ({errorSummary.totalErrors || 0})
        </button>
      </div>

      {/* TAB 1: PIPELINE CHAIN MONITOR (No In-Flight Events Preview) */}
      {activeTab === 'chain' ? (
        <div
          style={{
            display: 'flex',
            height: 620,
            border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.lg,
            overflow: 'hidden',
            background: COLORS.background.primary,
            boxShadow: SHADOWS.sm,
          }}
        >
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            mode="monitor"
            currentPipelineId={workflow.currentPipelineId}
            selectedItem={
              isTriggerSelected
                ? { type: 'trigger' }
                : { type: 'node', pipelineId: selectedPipelineId }
            }
            topologyInfo={{
              chainCount: workflow.chainCount || 0,
              singleChainReady: isSingleChainReady,
            }}
            onSelectTrigger={() => setSelectedPipelineId('__TRIGGER__')}
            onSelectNode={(pid) => setSelectedPipelineId(pid)}
          />

          {/* Right-Side Step Execution Detail Panel */}
          <div
            style={{
              width: 360,
              borderLeft: `1px solid ${COLORS.border.light}`,
              background: COLORS.background.primary,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${COLORS.border.light}`,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: FONT.size.md,
                  fontWeight: FONT.weight.semibold,
                  color: COLORS.text.primary,
                }}
              >
                {selectedNode ? 'Step Execution Status' : 'Workflow Details'}
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: FONT.size.xs,
                  color: COLORS.text.secondary,
                }}
              >
                {selectedNode
                  ? 'Click any pipeline step in the chain to inspect its progress'
                  : 'Single-chain readiness and pre-run checklist'}
              </p>
            </div>

            {!selectedNode && (
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  style={{
                    padding: 14,
                    borderRadius: BORDER_RADIUS.md,
                    background: isSingleChainReady
                      ? COLORS.status.successLight
                      : COLORS.background.secondary,
                    border: `1px solid ${
                      isSingleChainReady ? COLORS.status.success : COLORS.border.light
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <i
                      className={
                        isSingleChainReady
                          ? 'fa-solid fa-circle-check'
                          : 'fa-solid fa-list-check'
                      }
                      style={{
                        color: isSingleChainReady
                          ? COLORS.status.successDark
                          : COLORS.brand.primary,
                        fontSize: 14,
                      }}
                    />
                    <span
                      style={{
                        fontSize: FONT.size.sm,
                        fontWeight: FONT.weight.semibold,
                        color: isSingleChainReady
                          ? COLORS.status.successText
                          : COLORS.text.primary,
                      }}
                    >
                      {isSingleChainReady ? 'Ready for Execution' : 'Pre-Run Checklist'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      fontSize: FONT.size.xs,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: COLORS.text.secondary,
                      }}
                    >
                      <i
                        className={
                          nodes.length >= 1 ? 'fa-solid fa-check' : 'fa-solid fa-circle-dot'
                        }
                        style={{
                          color:
                            nodes.length >= 1 ? COLORS.status.success : COLORS.text.tertiary,
                          width: 14,
                        }}
                      />
                      <span>At least 1 pipeline step ({nodes.length} added)</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: COLORS.text.secondary,
                      }}
                    >
                      <i
                        className={
                          nodes.length >= 1 && (workflow.chainCount || 0) === 1
                            ? 'fa-solid fa-check'
                            : 'fa-solid fa-circle-dot'
                        }
                        style={{
                          color:
                            nodes.length >= 1 && (workflow.chainCount || 0) === 1
                              ? COLORS.status.success
                              : COLORS.status.warning,
                          width: 14,
                        }}
                      />
                      <span>
                        Single connected pipeline chain ({workflow.chainCount || 0}{' '}
                        {(workflow.chainCount || 0) === 1 ? 'chain' : 'chains'})
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: COLORS.text.secondary,
                      }}
                    >
                      <i
                        className={
                          nodes.length >= 1 &&
                          nodes.every(
                            (n) =>
                              !['DRAFT', 'NOT_VALIDATED', 'INVALID'].includes(n.pipelineStatus)
                          )
                            ? 'fa-solid fa-check'
                            : 'fa-solid fa-circle-dot'
                        }
                        style={{
                          color:
                            nodes.length >= 1 &&
                            nodes.every(
                              (n) =>
                                !['DRAFT', 'NOT_VALIDATED', 'INVALID'].includes(n.pipelineStatus)
                            )
                              ? COLORS.status.success
                              : COLORS.status.error,
                          width: 14,
                        }}
                      />
                      <span>All member pipelines in Validated status</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedNode && (
              <div
                style={{
                  padding: 18,
                  borderBottom: `1px solid ${COLORS.border.light}`,
                  background: COLORS.background.secondary,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: FONT.size.md,
                      fontWeight: FONT.weight.semibold,
                      color: COLORS.text.primary,
                    }}
                  >
                    {selectedNode.pipelineName}
                  </span>
                  <StatusBadge status={selectedNode.pipelineStatus} />
                </div>

                <div
                  style={{
                    fontSize: FONT.size.xs,
                    color: COLORS.text.secondary,
                    marginBottom: 12,
                  }}
                >
                  {selectedNode.sourceName} <i className="fa-solid fa-arrow-right" />{' '}
                  {selectedNode.targetName} · {selectedNode.tableCount} tables
                </div>

                <ProgressBar
                  value={selectedNode.progress || 0}
                  status={selectedNode.pipelineStatus}
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginTop: 12,
                    fontSize: FONT.size.xs,
                  }}
                >
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: BORDER_RADIUS.sm,
                      background: COLORS.background.primary,
                      border: `1px solid ${COLORS.border.light}`,
                    }}
                  >
                    <div style={{ color: COLORS.text.tertiary }}>Rows Migrated</div>
                    <div
                      style={{
                        fontWeight: FONT.weight.semibold,
                        color: COLORS.text.primary,
                        marginTop: 2,
                      }}
                    >
                      {(selectedNode.rowsProcessed || 0).toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: BORDER_RADIUS.sm,
                      background: COLORS.background.primary,
                      border: `1px solid ${COLORS.border.light}`,
                    }}
                  >
                    <div style={{ color: COLORS.text.tertiary }}>Throughput</div>
                    <div
                      style={{
                        fontWeight: FONT.weight.semibold,
                        color: COLORS.text.primary,
                        marginTop: 2,
                      }}
                    >
                      {(selectedNode.rowsPerSec || 0).toLocaleString()} rows/s
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/pipelines/${selectedNode.pipelineId}/monitor`)}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 5 }} />
                    Pipeline Monitor
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setErrorFilterPipelineId(selectedNode.pipelineId);
                      setActiveTab('errors');
                    }}
                  >
                    <i className="fa-solid fa-bug" style={{ marginRight: 5 }} />
                    Step Errors ({selectedNode.errorsSkipped || 0})
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* TAB 2: AGGREGATED WORKFLOW ERROR LOGS */
        <div
          style={{
            background: COLORS.background.primary,
            border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.lg,
            padding: 20,
            boxShadow: SHADOWS.sm,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={errorFilterPipelineId}
                onChange={(e) => setErrorFilterPipelineId(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: BORDER_RADIUS.md,
                  border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.sm,
                }}
              >
                <option value="">All Pipelines in Workflow ({nodes.length})</option>
                {nodes.map((n, idx) => (
                  <option key={n.pipelineId} value={n.pipelineId}>
                    Step #{idx + 1}: {n.pipelineName}
                  </option>
                ))}
              </select>

              <select
                value={errorFilterType}
                onChange={(e) => setErrorFilterType(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: BORDER_RADIUS.md,
                  border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.sm,
                }}
              >
                <option value="">All Error Types</option>
                {(errorSummary.errorsByType || []).map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.type} ({item.count})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Filter by table or error message..."
                value={errorSearch}
                onChange={(e) => setErrorSearch(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: BORDER_RADIUS.md,
                  border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.sm,
                  minWidth: 240,
                }}
              />
            </div>

            {errorSummary.totalErrors > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button size="sm" variant="secondary" onClick={() => handleExportErrors('csv')}>
                  <i className="fa-solid fa-file-csv" style={{ marginRight: 5 }} />
                  CSV
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleExportErrors('json')}>
                  <i className="fa-solid fa-file-code" style={{ marginRight: 5 }} />
                  JSON
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleExportErrors('txt')}>
                  <i className="fa-solid fa-file-lines" style={{ marginRight: 5 }} />
                  TXT
                </Button>
                <Button size="sm" variant="secondary" onClick={handleClearErrors}>
                  <i className="fa-solid fa-trash-can" style={{ marginRight: 6 }} />
                  Clear Logs
                </Button>
              </div>
            )}
          </div>

          {filteredErrors.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: COLORS.text.secondary }}>
              <i
                className="fa-solid fa-circle-check"
                style={{ fontSize: 22, color: COLORS.status.success, marginBottom: 8, display: 'block' }}
              />
              No errors logged across the workflow pipelines.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT.size.xs }}>
              <thead>
                <tr
                  style={{
                    background: COLORS.background.secondary,
                    borderBottom: `1px solid ${COLORS.border.light}`,
                    textAlign: 'left',
                    color: COLORS.text.secondary,
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '10px 12px' }}>Pipeline Step</th>
                  <th style={{ padding: '10px 12px' }}>Error Type</th>
                  <th style={{ padding: '10px 12px' }}>Source → Target</th>
                  <th style={{ padding: '10px 12px' }}>Chunk / Row</th>
                  <th style={{ padding: '10px 12px' }}>Error Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredErrors.map((err) => {
                  const isExpanded = expandedErrorId === err.id;
                  return (
                    <React.Fragment key={err.id}>
                      <tr
                        onClick={() => setExpandedErrorId(isExpanded ? null : err.id)}
                        style={{
                          borderBottom: `1px solid ${COLORS.border.light}`,
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: FONT.weight.semibold }}>
                          {err.pipelineName || err.pipelineId}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <StatusBadge status="ERROR" label={err.errorType} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {err.sourceTable} <i className="fa-solid fa-arrow-right" /> {err.targetTable}
                        </td>
                        <td style={{ padding: '10px 12px', color: COLORS.text.secondary }}>
                          Chunk #{err.chunkNumber ?? 0} · Row #{err.rowNumber ?? 0}
                        </td>
                        <td style={{ padding: '10px 12px', color: COLORS.status.errorText, wordBreak: 'break-word' }}>
                          {err.errorMessage}
                        </td>
                      </tr>
                      {isExpanded && err.sourceRowData && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: '10px 16px',
                              background: COLORS.background.secondary,
                              borderBottom: `1px solid ${COLORS.border.light}`,
                              maxWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: FONT.weight.semibold,
                                marginBottom: 4,
                                color: COLORS.text.secondary,
                              }}
                            >
                              Source Row Payload:
                            </div>
                            <pre
                              style={{
                                margin: 0,
                                fontSize: '11px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                overflowWrap: 'anywhere',
                                color: COLORS.text.primary,
                              }}
                            >
                              {err.sourceRowData}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Re-Run Workflow Options Modal */}
      {reRunModalOpen && (() => {
        const erroredNodes = nodes.filter((n) => n.pipelineStatus === 'ERRORED');
        const incompleteNodes = nodes.filter((n) => n.pipelineStatus !== 'COMPLETED');
        const targetStageNodes =
          erroredNodes.length > 0
            ? erroredNodes
            : incompleteNodes.length > 0
              ? [incompleteNodes[0]]
              : nodes.length > 0
                ? [nodes[0]]
                : [];
        const targetStageLabel =
          targetStageNodes.length > 0
            ? targetStageNodes
                .map((n, i) => `Step #${n.stepNumber || i + 1} (${n.pipelineName})`)
                .join(', ')
            : 'Stage 1';

        const reRunOptions = [
          {
            value: 'START',
            title: '1. Restart workflow from beginning',
            desc: 'Clears checkpoints across all stages and starts execution from Step #1.',
            icon: 'fa-solid fa-rotate-left',
          },
          {
            value: 'RERUN_FAILED_STAGE',
            title: '2. Restart from last failed stage',
            desc: `Keeps completed upstream & parallel sibling stages intact and restarts ${targetStageLabel} from the beginning.`,
            icon: 'fa-solid fa-forward-step',
          },
          {
            value: 'RERUN_FROM_CHECKPOINT',
            title: '3. Restart from last checkpoint',
            desc: `Keeps completed upstream & parallel sibling stages intact and resumes ${targetStageLabel} from its last completed chunk checkpoint.`,
            icon: 'fa-solid fa-bookmark',
          },
        ];

        return (
          <div
            onClick={() => !actionBusy && setReRunModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 480,
                background: COLORS.background.primary,
                borderRadius: BORDER_RADIUS.lg,
                boxShadow: SHADOWS.lg || '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                border: `1px solid ${COLORS.border.light}`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: `1px solid ${COLORS.border.light}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i
                    className="fa-solid fa-rotate-right"
                    style={{ color: COLORS.brand.primary, fontSize: 15 }}
                  />
                  <h3
                    style={{
                      margin: 0,
                      fontSize: FONT.size.lg,
                      fontWeight: FONT.weight.semibold,
                      color: COLORS.text.primary,
                    }}
                  >
                    Re-Run Workflow
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => setReRunModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: COLORS.text.tertiary,
                    fontSize: 14,
                    padding: 4,
                  }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: FONT.size.xs,
                    color: COLORS.text.secondary,
                  }}
                >
                  Choose how you want to re-run <strong>{workflow.name}</strong>:
                </p>

                {reRunOptions.map((opt) => {
                  const isSelected = selectedReRunMode === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedReRunMode(opt.value)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: BORDER_RADIUS.md,
                        border: `1.5px solid ${
                          isSelected ? COLORS.brand.primary : COLORS.border.light
                        }`,
                        background: isSelected
                          ? COLORS.brand.light || '#EEF2FF'
                          : COLORS.background.secondary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="reRunMode"
                        checked={isSelected}
                        onChange={() => setSelectedReRunMode(opt.value)}
                        style={{ marginTop: 3, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: FONT.size.sm,
                            fontWeight: FONT.weight.semibold,
                            color: COLORS.text.primary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <i
                            className={opt.icon}
                            style={{
                              fontSize: 12,
                              color: isSelected ? COLORS.brand.primary : COLORS.text.secondary,
                            }}
                          />
                          <span>{opt.title}</span>
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: FONT.size.xs,
                            color: COLORS.text.secondary,
                            lineHeight: 1.4,
                          }}
                        >
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  padding: '12px 20px',
                  borderTop: `1px solid ${COLORS.border.light}`,
                  background: COLORS.background.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <Button
                  variant="secondary"
                  disabled={actionBusy}
                  onClick={() => setReRunModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={actionBusy}
                  onClick={async () => {
                    setReRunModalOpen(false);
                    await handleAction(selectedReRunMode);
                  }}
                >
                  <i className="fa-solid fa-play" style={{ marginRight: 6 }} />
                  Proceed
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default WorkflowMonitor;

