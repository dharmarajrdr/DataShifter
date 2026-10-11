import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  MetricCard,
  ProgressBar,
  StatusBadge,
} from '../components/common';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS, SPACING } from '../constants/design';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { workflowApi } from '../services/api';

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
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);

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

  const fetchWorkflow = useCallback(async () => {
    try {
      const res = await workflowApi.getById(workflowId);
      if (res.data) {
        setWorkflow(res.data);
        if (!selectedPipelineId && res.data.nodes?.length > 0) {
          setSelectedPipelineId(
            res.data.currentPipelineId || res.data.nodes[0].pipelineId
          );
        }
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load workflow monitor');
    } finally {
      setLoading(false);
    }
  }, [workflowId, selectedPipelineId, notify]);

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
      // Ignore error log polling failure silently
    }
  }, [workflowId, errorFilterPipelineId]);

  useEffect(() => {
    fetchWorkflow();
    fetchErrors();
    const timer = setInterval(() => {
      fetchWorkflow();
      if (activeTab === 'errors') {
        fetchErrors();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchWorkflow, fetchErrors, activeTab]);

  const handleAction = async (action) => {
    setActionBusy(true);
    try {
      const res = await workflowApi.performAction(workflowId, action);
      if (res.data) setWorkflow(res.data);
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

  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];
  const completedSteps = nodes.filter(
    (n) => n.lastRunOutcome === 'COMPLETED' || n.pipelineStatus === 'COMPLETED'
  ).length;
  const canStart = workflow.singleChainReady && workflow.status !== 'RUNNING';
  const selectedNode =
    nodes.find((n) => n.pipelineId === selectedPipelineId) || nodes[0] || null;

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
            <StatusBadge status={workflow.status} />
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
          {workflow.status === 'RUNNING' ? (
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
          ) : workflow.status === 'PAUSED' ? (
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
            hasPermission('workflow:run') && (
              <Button
                variant="primary"
                disabled={!canStart || actionBusy}
                onClick={() => handleAction('START')}
              >
                <i className="fa-solid fa-play" style={{ marginRight: 6 }} />
                {workflow.status === 'COMPLETED' ||
                workflow.status === 'FAILED' ||
                workflow.status === 'STOPPED'
                  ? 'Re-Run Workflow'
                  : 'Start Workflow'}
              </Button>
            )
          )}

          {hasPermission('workflow:edit') && (
            <Button
              variant="secondary"
              disabled={workflow.status === 'RUNNING' || workflow.status === 'PAUSED'}
              onClick={() => navigate(`/workflows/${workflowId}/edit`)}
            >
              <i className="fa-solid fa-diagram-project" style={{ marginRight: 6 }} />
              Edit Chain
            </Button>
          )}
        </div>
      </div>

      {/* Pre-Run Validation Warnings */}
      {!workflow.singleChainReady && (workflow.validationErrors || []).length > 0 && (
        <div
          style={{
            marginBottom: SPACING.md,
            padding: '12px 16px',
            borderRadius: BORDER_RADIUS.md,
            background: COLORS.status.warningLight,
            border: `1px solid ${COLORS.status.warning}`,
            color: COLORS.status.warningText,
            fontSize: FONT.size.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
            <b>Workflow cannot start yet:</b> {workflow.validationErrors.join(' · ')}
          </div>
          {hasPermission('workflow:edit') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/workflows/${workflowId}/edit`)}
            >
              Fix in Chain Builder
            </Button>
          )}
        </div>
      )}

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
              selectedPipelineId ? { type: 'node', pipelineId: selectedPipelineId } : null
            }
            topologyInfo={{
              chainCount: workflow.chainCount || 0,
              singleChainReady: workflow.singleChainReady,
            }}
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
                Step Execution Status
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: FONT.size.xs,
                  color: COLORS.text.secondary,
                }}
              >
                Click any pipeline step in the chain to inspect its progress
              </p>
            </div>

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
                  <StatusBadge
                    status={
                      selectedNode.lastRunOutcome && selectedNode.lastRunOutcome !== 'PENDING'
                        ? selectedNode.lastRunOutcome
                        : selectedNode.pipelineStatus
                    }
                  />
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

            {/* Ordered Step List */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontSize: FONT.size.xs,
                  fontWeight: FONT.weight.semibold,
                  color: COLORS.text.tertiary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Execution Sequence
              </div>
              {nodes.map((n, index) => {
                const isSelected = selectedNode?.pipelineId === n.pipelineId;
                const stepStatus =
                  n.lastRunOutcome && n.lastRunOutcome !== 'PENDING'
                    ? n.lastRunOutcome
                    : n.pipelineStatus;
                return (
                  <div
                    key={n.pipelineId}
                    onClick={() => setSelectedPipelineId(n.pipelineId)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: BORDER_RADIUS.md,
                      border: isSelected
                        ? `1.5px solid ${COLORS.brand.primary}`
                        : `1px solid ${COLORS.border.light}`,
                      background: isSelected
                        ? COLORS.accent.purpleLight
                        : COLORS.background.primary,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: FONT.size.sm,
                          fontWeight: FONT.weight.medium,
                          color: COLORS.text.primary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {index + 1}. {n.pipelineName}
                      </div>
                      <div style={{ fontSize: '11px', color: COLORS.text.secondary, marginTop: 2 }}>
                        {(n.rowsProcessed || 0).toLocaleString()} rows · {Math.round(n.progress || 0)}%
                      </div>
                    </div>
                    <StatusBadge status={stepStatus} />
                  </div>
                );
              })}
            </div>
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
                        <td style={{ padding: '10px 12px', color: COLORS.status.errorText }}>
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
                                overflowX: 'auto',
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
    </div>
  );
};

export default WorkflowMonitor;

