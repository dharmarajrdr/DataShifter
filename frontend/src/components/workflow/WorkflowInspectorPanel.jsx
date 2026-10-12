import React, { useEffect, useRef, useState } from 'react';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS, SPACING } from '../../constants/design';
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
  onUpdateEdge,
  onDeleteEdge,
  onOpenAddStep,
  onCloseInspector,
  onNavigatePipeline,
  readOnly = false,
  isEditMode = false,
}) => {
  const mode = inspectorState?.mode || 'workflow_meta';

  // Local draft state for 'add_step'
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [attachAfterId, setAttachAfterId] = useState('');
  const [connectionMode, setConnectionMode] = useState('PARALLEL'); // 'PARALLEL' | 'SERIES'
  const [addFailureAction, setAddFailureAction] = useState('STOP_WORKFLOW');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPipelineDropdownOpen, setIsPipelineDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Local draft state for 'inspect_node': map of { [sourcePipelineId]: onFailureAction }
  const [draftFailActionsMap, setDraftFailActionsMap] = useState({});

  // Local draft state for 'inspect_edge'
  const [edgeFailAction, setEdgeFailAction] = useState('STOP_WORKFLOW');

  const availablePipelinesToAdd = eligiblePipelines.filter(
    (p) => !nodes.some((n) => n.pipelineId === p.id)
  );

  // Close pipeline dropdown when clicking outside
  useEffect(() => {
    if (!isPipelineDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsPipelineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPipelineDropdownOpen]);

  // Sync local state when inspector mode/target changes
  useEffect(() => {
    if (mode === 'add_step') {
      setSelectedPipelineId('');
      // Default predecessor: specified defaultAfterPipelineId or last leaf node
      const tailNode = [...nodes]
        .reverse()
        .find((n) => !edges.some((e) => e.sourcePipelineId === n.pipelineId));
      setAttachAfterId(inspectorState?.defaultAfterPipelineId ?? (tailNode ? tailNode.pipelineId : ''));
      setConnectionMode(inspectorState?.defaultConnectionMode || 'PARALLEL');
      setAddFailureAction('STOP_WORKFLOW');
      setSearchQuery('');
      setIsPipelineDropdownOpen(false);
    } else if (mode === 'inspect_node' && inspectorState?.pipelineId) {
      const pid = inspectorState.pipelineId;
      const inEdges = edges.filter((e) => e.targetPipelineId === pid);
      const map = {};
      inEdges.forEach((e) => {
        map[e.sourcePipelineId] = e.onFailureAction || 'STOP_WORKFLOW';
      });
      setDraftFailActionsMap(map);
    } else if (mode === 'inspect_edge' && inspectorState?.sourcePipelineId && inspectorState?.targetPipelineId) {
      const edge = edges.find(
        (e) =>
          e.sourcePipelineId === inspectorState.sourcePipelineId &&
          e.targetPipelineId === inspectorState.targetPipelineId
      );
      setEdgeFailAction(edge?.onFailureAction || 'STOP_WORKFLOW');
    }
  }, [
    mode,
    inspectorState?.defaultAfterPipelineId,
    inspectorState?.defaultConnectionMode,
    inspectorState?.pipelineId,
    inspectorState?.sourcePipelineId,
    inspectorState?.targetPipelineId,
    nodes.length,
    edges.length,
  ]);

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
    const selectedPipelineObj = availablePipelinesToAdd.find((p) => p.id === selectedPipelineId) || null;
    const filteredPipelines = isPipelineDropdownOpen
      ? availablePipelinesToAdd.filter((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];

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
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>Select Validated Pipeline</label>
            {availablePipelinesToAdd.length === 0 ? (
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
              <>
                <button
                  type="button"
                  onClick={() => setIsPipelineDropdownOpen((prev) => !prev)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: BORDER_RADIUS.md,
                    border: isPipelineDropdownOpen
                      ? `1.5px solid ${COLORS.brand.primary}`
                      : `1px solid ${COLORS.border.medium}`,
                    background: COLORS.background.primary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    textAlign: 'left',
                    boxSizing: 'border-box',
                  }}
                >
                  {selectedPipelineObj ? (
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: FONT.size.sm,
                          fontWeight: FONT.weight.semibold,
                          color: COLORS.text.primary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {selectedPipelineObj.name}
                      </div>
                      <div style={{ fontSize: '11px', color: COLORS.text.secondary, marginTop: 2 }}>
                        {selectedPipelineObj.tableCount ?? 0} tables · Validated
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: FONT.size.sm, color: COLORS.text.tertiary }}>
                      Select a validated pipeline...
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {selectedPipelineObj && (
                      <StatusBadge status={selectedPipelineObj.status || 'VALIDATED'} />
                    )}
                    <i
                      className={`fa-solid fa-chevron-${isPipelineDropdownOpen ? 'up' : 'down'}`}
                      style={{ fontSize: 11, color: COLORS.text.secondary }}
                    />
                  </div>
                </button>

                {isPipelineDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: COLORS.background.primary,
                      border: `1px solid ${COLORS.border.medium}`,
                      borderRadius: BORDER_RADIUS.md,
                      boxShadow: SHADOWS.md,
                      zIndex: 25,
                      padding: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search validated pipelines..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ ...inputStyle, padding: '7px 10px', fontSize: FONT.size.sm }}
                    />
                    {filteredPipelines.length === 0 ? (
                      <div
                        style={{
                          padding: '12px 8px',
                          fontSize: FONT.size.xs,
                          color: COLORS.text.secondary,
                          textAlign: 'center',
                        }}
                      >
                        No matching pipelines found
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          maxHeight: 210,
                          overflowY: 'auto',
                        }}
                      >
                        {filteredPipelines.map((p) => {
                          const isSelected = selectedPipelineId === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedPipelineId(p.id);
                                setIsPipelineDropdownOpen(false);
                              }}
                              style={{
                                padding: '9px 10px',
                                borderRadius: BORDER_RADIUS.sm,
                                border: isSelected
                                  ? `1.5px solid ${COLORS.brand.primary}`
                                  : `1px solid transparent`,
                                background: isSelected
                                  ? COLORS.accent.purpleLight
                                  : COLORS.background.primary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = COLORS.background.secondary;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = COLORS.background.primary;
                                }
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: FONT.size.sm,
                                    fontWeight: FONT.weight.semibold,
                                    color: isSelected
                                      ? COLORS.accent.purpleText
                                      : COLORS.text.primary,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {p.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: COLORS.text.secondary,
                                    marginTop: 2,
                                  }}
                                >
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
                )}
              </>
            )}
          </div>

          {attachAfterId &&
            attachAfterId !== '__TRIGGER__' &&
            edges.some((e) => e.sourcePipelineId === attachAfterId) && (
              <div>
                <label style={labelStyle}>Connection Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    {
                      value: 'PARALLEL',
                      label: 'Run in Parallel',
                      desc: 'Branch alongside existing successor(s)',
                      icon: 'fa-solid fa-code-branch',
                    },
                    {
                      value: 'SERIES',
                      label: 'Insert in Series',
                      desc: 'Splice before existing successor(s)',
                      icon: 'fa-solid fa-arrow-down-short-wide',
                    },
                  ].map((opt) => {
                    const active = connectionMode === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => setConnectionMode(opt.value)}
                        style={{
                          padding: '9px 10px',
                          borderRadius: BORDER_RADIUS.md,
                          border: active
                            ? `1.5px solid ${COLORS.brand.primary}`
                            : `1px solid ${COLORS.border.light}`,
                          background: active
                            ? COLORS.accent.purpleLight
                            : COLORS.background.primary,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <div
                          style={{
                            fontSize: FONT.size.xs,
                            fontWeight: FONT.weight.semibold,
                            color: active ? COLORS.accent.purpleText : COLORS.text.primary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <i
                            className={opt.icon}
                            style={{
                              fontSize: 12,
                              color: active ? COLORS.brand.primary : COLORS.text.secondary,
                            }}
                          />
                          <span>{opt.label}</span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: COLORS.text.secondary,
                            marginTop: 3,
                            lineHeight: 1.3,
                          }}
                        >
                          {opt.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {((attachAfterId && attachAfterId !== '__TRIGGER__') ||
            (attachAfterId === '__TRIGGER__' && nodes.length > 0)) && (
            <div>
              <label style={labelStyle}>
                {attachAfterId === '__TRIGGER__'
                  ? 'On This Pipeline Fails'
                  : 'On Previous Pipeline Fails'}
              </label>
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
                onAddStep(chosen, attachAfterId || null, addFailureAction, connectionMode);
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

    const incomingEdges = edges.filter((e) => e.targetPipelineId === node.pipelineId);
    const outgoingEdges = edges.filter((e) => e.sourcePipelineId === node.pipelineId);

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
              Configure pipeline connections &amp; failure behavior
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

          {/* Quick Add Step After This Pipeline (Parallel or Series) */}
          {!readOnly && onOpenAddStep && (
            <div>
              <label style={labelStyle}>Add Next Step After This Pipeline</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onOpenAddStep(node.pipelineId, 'PARALLEL')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: BORDER_RADIUS.md,
                    border: `1px dashed ${COLORS.brand.primary}`,
                    background: COLORS.accent.purpleLight,
                    color: COLORS.accent.purpleText,
                    fontSize: FONT.size.xs,
                    fontWeight: FONT.weight.semibold,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <i className="fa-solid fa-code-branch" />
                  + Parallel Step
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAddStep(node.pipelineId, 'SERIES')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: BORDER_RADIUS.md,
                    border: `1px solid ${COLORS.border.medium}`,
                    background: COLORS.background.primary,
                    color: COLORS.text.primary,
                    fontSize: FONT.size.xs,
                    fontWeight: FONT.weight.semibold,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <i className="fa-solid fa-arrow-down" />
                  + Series Step
                </button>
              </div>
            </div>
          )}

          {/* Outgoing Successor Steps Summary */}
          {outgoingEdges.length > 0 && (
            <div>
              <label style={labelStyle}>
                Downstream Steps ({outgoingEdges.length}{' '}
                {outgoingEdges.length > 1 ? 'Parallel Branches' : 'Step'})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {outgoingEdges.map((outE) => {
                  const succNode = nodes.find((n) => n.pipelineId === outE.targetPipelineId);
                  return (
                    <div
                      key={`${outE.sourcePipelineId}->${outE.targetPipelineId}`}
                      style={{
                        padding: '8px 10px',
                        borderRadius: BORDER_RADIUS.sm,
                        background: COLORS.background.secondary,
                        border: `1px solid ${COLORS.border.light}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: FONT.size.xs,
                      }}
                    >
                      <span style={{ fontWeight: FONT.weight.medium, color: COLORS.text.primary }}>
                        <i
                          className="fa-solid fa-arrow-turn-down"
                          style={{ marginRight: 6, color: COLORS.brand.primary }}
                        />
                        {succNode?.pipelineName || outE.targetPipelineId}
                      </span>
                      {!readOnly && onDeleteEdge && (
                        <button
                          type="button"
                          title="Detach link"
                          onClick={() => onDeleteEdge(outE.sourcePipelineId, outE.targetPipelineId)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: COLORS.status.error,
                            cursor: 'pointer',
                            fontSize: 11,
                            padding: 2,
                          }}
                        >
                          <i className="fa-solid fa-link-slash" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Failure Action for Each Incoming Predecessor */}
          {incomingEdges.map((inEdge) => {
            const predNode = nodes.find((n) => n.pipelineId === inEdge.sourcePipelineId);
            const currentVal =
              draftFailActionsMap[inEdge.sourcePipelineId] ||
              inEdge.onFailureAction ||
              'STOP_WORKFLOW';
            return (
              <div key={`in-${inEdge.sourcePipelineId}`}>
                <label style={labelStyle}>
                  {incomingEdges.length > 1
                    ? `If '${predNode?.pipelineName || 'Predecessor'}' Fails`
                    : 'On Previous Pipeline Fails'}
                </label>
                {renderFailureActionPicker(currentVal, (val) =>
                  setDraftFailActionsMap((prev) => ({
                    ...prev,
                    [inEdge.sourcePipelineId]: val,
                  }))
                )}
              </div>
            );
          })}
        </div>

        {!readOnly && incomingEdges.length > 0 && (
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
                  onUpdateNodeLinks(node.pipelineId, draftFailActionsMap);
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
        {!isEditMode && (
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
        )}

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
