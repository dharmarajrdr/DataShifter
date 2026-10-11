import React, { useEffect, useState } from 'react';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../constants/design';
import StatusBadge from '../common/StatusBadge';

export const FAILURE_ACTION_OPTIONS = [
  {
    value: 'STOP_WORKFLOW',
    title: 'Stop the workflow',
    desc: 'If the predecessor pipeline fails, immediately abort the entire workflow.',
    icon: 'fa-solid fa-circle-stop',
    color: COLORS.status.error,
  },
  {
    value: 'STOP_PIPELINE',
    title: 'Stop this pipeline',
    desc: 'If the predecessor pipeline fails, mark this pipeline as stopped and halt downstream steps.',
    icon: 'fa-solid fa-ban',
    color: COLORS.status.warning,
  },
  {
    value: 'CONTINUE_PIPELINE',
    title: 'Continue this pipeline',
    desc: 'If the predecessor pipeline fails, still start and execute this successor pipeline.',
    icon: 'fa-solid fa-forward-step',
    color: COLORS.status.info,
  },
];

const labelStyle = {
  display: 'block',
  fontSize: FONT.size.xs,
  fontWeight: FONT.weight.semibold,
  color: COLORS.text.secondary,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: BORDER_RADIUS.md,
  border: `1px solid ${COLORS.border.medium}`,
  fontSize: FONT.size.md,
  fontFamily: FONT.family,
  color: COLORS.text.primary,
  background: COLORS.background.primary,
  outline: 'none',
  boxSizing: 'border-box',
};

const WorkflowInspectorPanel = ({
  inspectorState, // { mode: 'workflow_meta' | 'add_step' | 'inspect_node' | 'inspect_edge', nodeId?, edgeKey? }
  workflowMeta,
  onChangeWorkflowMeta,
  namespaces = [],
  nodes = [],
  edges = [],
  eligiblePipelines = [],
  topologyInfo = { chainCount: 0, singleChainReady: false, validationErrors: [] },
  onAddStep,
  onUpdateNodeLinks,
  onRemoveNode,
  onUpdateEdge,
  onDeleteEdge,
  onOpenAddStep,
  onCloseInspector,
  onNavigatePipeline,
  readOnly = false,
}) => {
  const mode = inspectorState?.mode || 'workflow_meta';

  // Local draft state for 'add_step'
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [attachAfterId, setAttachAfterId] = useState('');
  const [addFailureAction, setAddFailureAction] = useState('STOP_WORKFLOW');
  const [searchQuery, setSearchQuery] = useState('');

  // Local draft state for 'inspect_node'
  const [draftPredId, setDraftPredId] = useState('');
  const [draftSuccId, setDraftSuccId] = useState('');
  const [draftFailAction, setDraftFailAction] = useState('STOP_WORKFLOW');

  // Local draft state for 'inspect_edge'
  const [edgeFailAction, setEdgeFailAction] = useState('STOP_WORKFLOW');

  const availablePipelinesToAdd = eligiblePipelines.filter(
    (p) => !nodes.some((n) => n.pipelineId === p.id)
  );

  // Sync local state when inspector mode/target changes
  useEffect(() => {
    if (mode === 'add_step') {
      const firstAvail = availablePipelinesToAdd[0]?.id || '';
      setSelectedPipelineId(firstAvail);
      // Default predecessor: tail of the current chain (node with no outgoing edge)
      const tailNode = [...nodes]
        .reverse()
        .find((n) => !edges.some((e) => e.sourcePipelineId === n.pipelineId));
      setAttachAfterId(inspectorState?.defaultAfterPipelineId ?? (tailNode ? tailNode.pipelineId : ''));
      setAddFailureAction('STOP_WORKFLOW');
      setSearchQuery('');
    } else if (mode === 'inspect_node' && inspectorState?.pipelineId) {
      const pid = inspectorState.pipelineId;
      const inEdge = edges.find((e) => e.targetPipelineId === pid);
      const outEdge = edges.find((e) => e.sourcePipelineId === pid);
      setDraftPredId(inEdge ? inEdge.sourcePipelineId : '');
      setDraftSuccId(outEdge ? outEdge.targetPipelineId : '');
      setDraftFailAction(inEdge?.onFailureAction || 'STOP_WORKFLOW');
    } else if (mode === 'inspect_edge' && inspectorState?.sourcePipelineId && inspectorState?.targetPipelineId) {
      const edge = edges.find(
        (e) =>
          e.sourcePipelineId === inspectorState.sourcePipelineId &&
          e.targetPipelineId === inspectorState.targetPipelineId
      );
      setEdgeFailAction(edge?.onFailureAction || 'STOP_WORKFLOW');
    }
  }, [mode, inspectorState?.pipelineId, inspectorState?.sourcePipelineId, inspectorState?.targetPipelineId, nodes.length, edges.length]);

  const renderFailureActionPicker = (value, onChange) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {FAILURE_ACTION_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <div
            key={opt.value}
            onClick={() => !readOnly && onChange(opt.value)}
            style={{
              padding: '10px 12px',
              borderRadius: BORDER_RADIUS.md,
              border: active ? `1.5px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`,
              background: active ? COLORS.accent.purpleLight : COLORS.background.primary,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              transition: 'all 0.12s ease',
            }}
          >
            <i
              className={opt.icon}
              style={{
                fontSize: 14,
                color: active ? COLORS.brand.primary : opt.color,
                marginTop: 2,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: FONT.size.sm,
                  fontWeight: FONT.weight.semibold,
                  color: active ? COLORS.accent.purpleText : COLORS.text.primary,
                }}
              >
                {opt.title}
              </div>
              <div style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: 2, lineHeight: 1.35 }}>
                {opt.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // =========================================================================
  // MODE 1: ADD STEP ("Set Action")
  // =========================================================================
  if (mode === 'add_step') {
    const filteredPipelines = availablePipelinesToAdd.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div
        style={{
          width: 360,
          background: COLORS.background.primary,
          borderLeft: `1px solid ${COLORS.border.light}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0,
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
          <div>
            <h3 style={{ margin: 0, fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
              Set Action
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
              Import a validated pipeline step into the workflow
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseInspector}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: COLORS.text.tertiary,
              padding: 4,
            }}
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: 15 }} />
          </button>
        </div>

        <div style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Select Validated Pipeline</label>
            <input
              type="text"
              placeholder="Search validated pipelines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            {filteredPipelines.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: BORDER_RADIUS.md,
                  background: COLORS.background.secondary,
                  border: `1px dashed ${COLORS.border.medium}`,
                  fontSize: FONT.size.xs,
                  color: COLORS.text.secondary,
                  textAlign: 'center',
                }}
              >
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6, color: COLORS.brand.primary }} />
                No unassigned <b>VALIDATED</b> pipelines found. Validate a pipeline first to import it into a workflow.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 210, overflowY: 'auto' }}>
                {filteredPipelines.map((p) => {
                  const isSelected = selectedPipelineId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPipelineId(p.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: BORDER_RADIUS.md,
                        border: isSelected ? `1.5px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`,
                        background: isSelected ? COLORS.accent.purpleLight : COLORS.background.primary,
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
                            fontWeight: FONT.weight.semibold,
                            color: isSelected ? COLORS.accent.purpleText : COLORS.text.primary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: '11px', color: COLORS.text.secondary, marginTop: 2 }}>
                          {p.tableCount ?? 0} tables · Validated
                        </div>
                      </div>
                      <StatusBadge status={p.status || 'VALIDATED'} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {nodes.length > 0 && (
            <div>
              <label style={labelStyle}>Attach After Step (Series Order)</label>
              <select
                value={attachAfterId}
                onChange={(e) => setAttachAfterId(e.target.value)}
                style={inputStyle}
              >
                <option value="">None (Start a separate chain while drafting)</option>
                {nodes.map((n, idx) => (
                  <option key={n.pipelineId} value={n.pipelineId}>
                    Step #{idx + 1}: {n.pipelineName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {attachAfterId && (
            <div>
              <label style={labelStyle}>On Previous Pipeline Fails</label>
              {renderFailureActionPicker(addFailureAction, setAddFailureAction)}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            background: COLORS.background.primary,
          }}
        >
          <button
            type="button"
            onClick={onCloseInspector}
            style={{
              padding: '8px 18px',
              borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${COLORS.border.medium}`,
              background: COLORS.background.primary,
              color: COLORS.text.primary,
              fontSize: FONT.size.sm,
              fontWeight: FONT.weight.medium,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedPipelineId}
            onClick={() => {
              const chosen = eligiblePipelines.find((p) => p.id === selectedPipelineId);
              if (chosen && onAddStep) {
                onAddStep(chosen, attachAfterId || null, addFailureAction);
              }
            }}
            style={{
              padding: '8px 20px',
              borderRadius: BORDER_RADIUS.md,
              border: 'none',
              background: selectedPipelineId ? COLORS.brand.primary : COLORS.border.medium,
              color: '#fff',
              fontSize: FONT.size.sm,
              fontWeight: FONT.weight.semibold,
              cursor: selectedPipelineId ? 'pointer' : 'not-allowed',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODE 2: INSPECT EXISTING NODE ("Configure Step")
  // =========================================================================
  if (mode === 'inspect_node') {
    const node = nodes.find((n) => n.pipelineId === inspectorState?.pipelineId);
    if (!node) return null;

    const otherNodes = nodes.filter((n) => n.pipelineId !== node.pipelineId);

    return (
      <div
        style={{
          width: 360,
          background: COLORS.background.primary,
          borderLeft: `1px solid ${COLORS.border.light}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0,
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
          <div>
            <h3 style={{ margin: 0, fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
              Set Action
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
              Configure pipeline link order & failure behavior
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseInspector}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: COLORS.text.tertiary,
              padding: 4,
            }}
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: 15 }} />
          </button>
        </div>

        <div style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Selected Pipeline Summary Card */}
          <div
            style={{
              padding: 14,
              borderRadius: BORDER_RADIUS.md,
              background: COLORS.background.secondary,
              border: `1px solid ${COLORS.border.light}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
                {node.pipelineName}
              </span>
              <StatusBadge status={node.pipelineStatus || 'VALIDATED'} />
            </div>
            <div style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: 4 }}>
              {node.sourceName || 'Source'} <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }} />{' '}
              {node.targetName || 'Target'} · {node.tableCount ?? 0} tables
            </div>
            {onNavigatePipeline && (
              <button
                type="button"
                onClick={() => onNavigatePipeline(node.pipelineId)}
                style={{
                  marginTop: 10,
                  padding: '5px 10px',
                  borderRadius: BORDER_RADIUS.sm,
                  border: `1px solid ${COLORS.border.medium}`,
                  background: COLORS.background.primary,
                  color: COLORS.brand.primary,
                  fontSize: FONT.size.xs,
                  fontWeight: FONT.weight.medium,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} />
                View Pipeline Configuration
              </button>
            )}
          </div>

          {/* Predecessor Step */}
          <div>
            <label style={labelStyle}>Predecessor Pipeline (Runs Before This)</label>
            <select
              disabled={readOnly}
              value={draftPredId}
              onChange={(e) => {
                const val = e.target.value;
                setDraftPredId(val);
                if (val && val === draftSuccId) setDraftSuccId('');
              }}
              style={inputStyle}
            >
              <option value="">None (Head of Chain)</option>
              {otherNodes.map((n) => (
                <option key={n.pipelineId} value={n.pipelineId}>
                  {n.pipelineName}
                </option>
              ))}
            </select>
          </div>

          {/* Failure Action when Predecessor Fails */}
          {draftPredId && (
            <div>
              <label style={labelStyle}>On Previous Pipeline Fails</label>
              {renderFailureActionPicker(draftFailAction, setDraftFailAction)}
            </div>
          )}

          {/* Successor Step */}
          <div>
            <label style={labelStyle}>Successor Pipeline (Runs After This)</label>
            <select
              disabled={readOnly}
              value={draftSuccId}
              onChange={(e) => {
                const val = e.target.value;
                setDraftSuccId(val);
                if (val && val === draftPredId) setDraftPredId('');
              }}
              style={inputStyle}
            >
              <option value="">None (End of Chain)</option>
              {otherNodes.map((n) => (
                <option key={n.pipelineId} value={n.pipelineId}>
                  {n.pipelineName}
                </option>
              ))}
            </select>
          </div>

          {!readOnly && (
            <div style={{ paddingTop: 10, borderTop: `1px solid ${COLORS.border.light}` }}>
              <button
                type="button"
                onClick={() => onRemoveNode && onRemoveNode(node.pipelineId)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: BORDER_RADIUS.md,
                  border: `1px solid ${COLORS.status.error}`,
                  background: COLORS.status.errorLight,
                  color: COLORS.status.errorText,
                  fontSize: FONT.size.xs,
                  fontWeight: FONT.weight.semibold,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-link-slash" />
                Remove Step from Workflow (Unlock Pipeline)
              </button>
            </div>
          )}
        </div>

        {!readOnly && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: `1px solid ${COLORS.border.light}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: COLORS.background.primary,
            }}
          >
            <button
              type="button"
              onClick={onCloseInspector}
              style={{
                padding: '8px 18px',
                borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.border.medium}`,
                background: COLORS.background.primary,
                color: COLORS.text.primary,
                fontSize: FONT.size.sm,
                fontWeight: FONT.weight.medium,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (onUpdateNodeLinks) {
                  onUpdateNodeLinks(
                    node.pipelineId,
                    draftPredId || null,
                    draftSuccId || null,
                    draftFailAction
                  );
                }
              }}
              style={{
                padding: '8px 20px',
                borderRadius: BORDER_RADIUS.md,
                border: 'none',
                background: COLORS.brand.primary,
                color: '#fff',
                fontSize: FONT.size.sm,
                fontWeight: FONT.weight.semibold,
                cursor: 'pointer',
              }}
            >
              Apply
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MODE 3: INSPECT EDGE ("Link Failure Action")
  // =========================================================================
  if (mode === 'inspect_edge') {
    const srcNode = nodes.find((n) => n.pipelineId === inspectorState?.sourcePipelineId);
    const tgtNode = nodes.find((n) => n.pipelineId === inspectorState?.targetPipelineId);

    return (
      <div
        style={{
          width: 360,
          background: COLORS.background.primary,
          borderLeft: `1px solid ${COLORS.border.light}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0,
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
          <div>
            <h3 style={{ margin: 0, fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
              Set Action
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
              Configure transition rule between linked pipelines
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseInspector}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.text.tertiary, padding: 4 }}
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: 15 }} />
          </button>
        </div>

        <div style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              padding: 12,
              borderRadius: BORDER_RADIUS.md,
              background: COLORS.background.secondary,
              border: `1px solid ${COLORS.border.light}`,
              fontSize: FONT.size.xs,
              color: COLORS.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: FONT.weight.semibold }}>{srcNode?.pipelineName || 'Predecessor'}</span>
            <i className="fa-solid fa-arrow-right" style={{ color: COLORS.brand.primary }} />
            <span style={{ fontWeight: FONT.weight.semibold }}>{tgtNode?.pipelineName || 'Successor'}</span>
          </div>

          <div>
            <label style={labelStyle}>On Previous Pipeline Fails</label>
            {renderFailureActionPicker(edgeFailAction, setEdgeFailAction)}
          </div>

          {!readOnly && (
            <div style={{ paddingTop: 10, borderTop: `1px solid ${COLORS.border.light}` }}>
              <button
                type="button"
                onClick={() =>
                  onDeleteEdge &&
                  onDeleteEdge(inspectorState.sourcePipelineId, inspectorState.targetPipelineId)
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: BORDER_RADIUS.md,
                  border: `1px solid ${COLORS.status.error}`,
                  background: COLORS.status.errorLight,
                  color: COLORS.status.errorText,
                  fontSize: FONT.size.xs,
                  fontWeight: FONT.weight.semibold,
                  cursor: 'pointer',
                }}
              >
                <i className="fa-solid fa-scissors" style={{ marginRight: 6 }} />
                Detach Pipeline Link
              </button>
            </div>
          )}
        </div>

        {!readOnly && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: `1px solid ${COLORS.border.light}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onCloseInspector}
              style={{
                padding: '8px 18px',
                borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.border.medium}`,
                background: COLORS.background.primary,
                color: COLORS.text.primary,
                fontSize: FONT.size.sm,
                fontWeight: FONT.weight.medium,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateEdge &&
                onUpdateEdge(
                  inspectorState.sourcePipelineId,
                  inspectorState.targetPipelineId,
                  edgeFailAction
                )
              }
              style={{
                padding: '8px 20px',
                borderRadius: BORDER_RADIUS.md,
                border: 'none',
                background: COLORS.brand.primary,
                color: '#fff',
                fontSize: FONT.size.sm,
                fontWeight: FONT.weight.semibold,
                cursor: 'pointer',
              }}
            >
              Apply
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MODE 4: WORKFLOW METADATA & READINESS CHECKLIST
  // =========================================================================
  return (
    <div
      style={{
        width: 360,
        background: COLORS.background.primary,
        borderLeft: `1px solid ${COLORS.border.light}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${COLORS.border.light}`,
        }}
      >
        <h3 style={{ margin: 0, fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
          Workflow Details
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
          Configure workflow properties and verify single-chain readiness
        </p>
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Workflow Name *</label>
          <input
            type="text"
            disabled={readOnly}
            placeholder="e.g., Core E-Commerce Migration"
            value={workflowMeta?.name || ''}
            onChange={(e) => onChangeWorkflowMeta && onChangeWorkflowMeta({ ...workflowMeta, name: e.target.value })}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Namespace</label>
          <select
            disabled={readOnly}
            value={workflowMeta?.namespaceId || ''}
            onChange={(e) =>
              onChangeWorkflowMeta && onChangeWorkflowMeta({ ...workflowMeta, namespaceId: e.target.value })
            }
            style={inputStyle}
          >
            <option value="">Default Namespace</option>
            {namespaces.map((ns) => (
              <option key={ns.id} value={ns.id}>
                {ns.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            rows={3}
            disabled={readOnly}
            placeholder="Describe the sequence of tables/pipelines migrated in this workflow..."
            value={workflowMeta?.description || ''}
            onChange={(e) =>
              onChangeWorkflowMeta && onChangeWorkflowMeta({ ...workflowMeta, description: e.target.value })
            }
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Readiness Checklist Card */}
        <div
          style={{
            padding: 14,
            borderRadius: BORDER_RADIUS.md,
            background: topologyInfo.singleChainReady ? COLORS.status.successLight : COLORS.background.secondary,
            border: `1px solid ${
              topologyInfo.singleChainReady ? COLORS.status.success : COLORS.border.light
            }`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <i
              className={
                topologyInfo.singleChainReady
                  ? 'fa-solid fa-circle-check'
                  : 'fa-solid fa-list-check'
              }
              style={{
                color: topologyInfo.singleChainReady ? COLORS.status.successDark : COLORS.brand.primary,
                fontSize: 14,
              }}
            />
            <span
              style={{
                fontSize: FONT.size.sm,
                fontWeight: FONT.weight.semibold,
                color: topologyInfo.singleChainReady ? COLORS.status.successText : COLORS.text.primary,
              }}
            >
              {topologyInfo.singleChainReady ? 'Ready for Execution' : 'Pre-Run Checklist'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: FONT.size.xs }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.text.secondary }}>
              <i
                className={nodes.length >= 1 ? 'fa-solid fa-check' : 'fa-solid fa-circle-dot'}
                style={{ color: nodes.length >= 1 ? COLORS.status.success : COLORS.text.tertiary, width: 14 }}
              />
              <span>At least 1 pipeline step ({nodes.length} added)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.text.secondary }}>
              <i
                className={
                  nodes.length >= 1 && topologyInfo.chainCount === 1
                    ? 'fa-solid fa-check'
                    : 'fa-solid fa-circle-dot'
                }
                style={{
                  color:
                    nodes.length >= 1 && topologyInfo.chainCount === 1
                      ? COLORS.status.success
                      : COLORS.status.warning,
                  width: 14,
                }}
              />
              <span>
                Single connected pipeline chain ({topologyInfo.chainCount}{' '}
                {topologyInfo.chainCount === 1 ? 'chain' : 'chains'})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.text.secondary }}>
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

        {!readOnly && (
          <button
            type="button"
            onClick={onOpenAddStep}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: BORDER_RADIUS.md,
              border: `1.5px dashed ${COLORS.brand.primary}`,
              background: COLORS.accent.purpleLight,
              color: COLORS.accent.purpleText,
              fontSize: FONT.size.sm,
              fontWeight: FONT.weight.semibold,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <i className="fa-solid fa-plus" />
            Add Pipeline Step
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkflowInspectorPanel;
