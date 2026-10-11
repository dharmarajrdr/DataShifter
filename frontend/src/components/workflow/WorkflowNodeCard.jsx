import { BORDER_RADIUS, COLORS, FONT, SHADOWS } from '../../constants/design';
import StatusBadge from '../common/StatusBadge';

const FAILURE_ACTION_LABELS = {
  STOP_WORKFLOW: { label: 'On fail: Stop workflow', color: COLORS.status.errorText, bg: COLORS.status.errorLight },
  STOP_PIPELINE: { label: 'On fail: Stop pipeline', color: COLORS.status.warningText, bg: COLORS.status.warningLight },
  CONTINUE_PIPELINE: { label: 'On fail: Continue', color: COLORS.status.infoText, bg: COLORS.status.infoLight },
};

const WorkflowNodeCard = ({
  node,
  stepNumber,
  isTrigger = false,
  selected = false,
  isRunningNode = false,
  incomingEdge = null,
  mode = 'builder', // 'builder' | 'monitor'
  onClick,
  onMouseDown,
  onStartConnect,
  onCompleteConnect,
  isConnecting = false,
}) => {
  if (isTrigger) {
    return (
      <div
        onClick={onClick}
        style={{
          width: 310,
          background: COLORS.background.primary,
          border: selected ? `2px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`,
          borderRadius: BORDER_RADIUS.lg,
          boxShadow: selected
            ? `0 0 0 3px rgba(83, 74, 183, 0.14), ${SHADOWS.md}`
            : SHADOWS.sm,
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        }}
      >
        <div
          style={{
            width: 54,
            background: COLORS.accent.purpleLight,
            borderRight: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i
            className="fa-solid fa-bolt"
            style={{ fontSize: 16, color: COLORS.brand.primary }}
          />
        </div>
        <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span
              style={{
                fontSize: FONT.size.md,
                fontWeight: FONT.weight.semibold,
                color: COLORS.text.primary,
              }}
            >
              Workflow Start Trigger
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: FONT.weight.medium,
                color: COLORS.accent.purpleText,
                background: COLORS.accent.purpleLight,
                padding: '2px 7px',
                borderRadius: BORDER_RADIUS.pill,
              }}
            >
              Trigger
            </span>
          </div>
          <div
            style={{
              fontSize: FONT.size.xs,
              color: COLORS.text.secondary,
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Executes linked pipeline chain in series
          </div>
        </div>
      </div>
    );
  }

  const status = mode === 'monitor' && node.lastRunOutcome && node.lastRunOutcome !== 'PENDING'
    ? node.lastRunOutcome
    : node.pipelineStatus || 'VALIDATED';

  const getIconConfig = () => {
    if (isRunningNode || status === 'RUNNING') {
      return {
        bg: COLORS.status.infoLight,
        color: COLORS.status.infoDark,
        icon: 'fa-solid fa-spinner fa-spin',
      };
    }
    if (status === 'COMPLETED') {
      return {
        bg: COLORS.status.successLight,
        color: COLORS.status.successDark,
        icon: 'fa-solid fa-circle-check',
      };
    }
    if (status === 'ERRORED' || status === 'INVALID' || status === 'FAILED') {
      return {
        bg: COLORS.status.errorLight,
        color: COLORS.status.errorDark,
        icon: 'fa-solid fa-triangle-exclamation',
      };
    }
    if (status === 'STOPPED' || status === 'SKIPPED') {
      return {
        bg: COLORS.status.warningLight,
        color: COLORS.status.warningDark,
        icon: 'fa-solid fa-ban',
      };
    }
    return {
      bg: selected ? COLORS.accent.purpleLight : COLORS.background.secondary,
      color: selected ? COLORS.brand.primary : COLORS.text.secondary,
      icon: 'fa-solid fa-diagram-project',
    };
  };

  const iconCfg = getIconConfig();
  const failureBadge = incomingEdge?.onFailureAction
    ? FAILURE_ACTION_LABELS[incomingEdge.onFailureAction]
    : null;

  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      style={{
        width: 310,
        background: COLORS.background.primary,
        border: selected
          ? `2px solid ${COLORS.brand.primary}`
          : isRunningNode
            ? `2px solid ${COLORS.status.info}`
            : `1px solid ${COLORS.border.light}`,
        borderRadius: BORDER_RADIUS.lg,
        boxShadow: selected
          ? `0 0 0 3px rgba(83, 74, 183, 0.14), ${SHADOWS.md}`
          : SHADOWS.sm,
        position: 'relative',
        cursor: mode === 'builder' ? 'grab' : 'pointer',
        userSelect: 'none',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Top input connector port */}
      {mode === 'builder' && (
        <div
          title="Drop link here to set as successor"
          onMouseUp={(e) => {
            e.stopPropagation();
            if (onCompleteConnect) onCompleteConnect(node.pipelineId);
          }}
          style={{
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: isConnecting ? COLORS.brand.primary : COLORS.background.primary,
            border: `2px solid ${COLORS.brand.primary}`,
            zIndex: 3,
            cursor: 'pointer',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden', borderRadius: BORDER_RADIUS.lg }}>
        {/* Left icon well */}
        <div
          style={{
            width: 54,
            background: iconCfg.bg,
            borderRight: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <i className={iconCfg.icon} style={{ fontSize: 16, color: iconCfg.color }} />
          {stepNumber != null && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: FONT.weight.semibold,
                color: iconCfg.color,
              }}
            >
              #{stepNumber}
            </span>
          )}
        </div>

        {/* Right content compartment */}
        <div style={{ padding: '11px 14px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span
              style={{
                fontSize: FONT.size.md,
                fontWeight: FONT.weight.semibold,
                color: COLORS.text.primary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={node.pipelineName}
            >
              {node.pipelineName}
            </span>
            <StatusBadge status={status} />
          </div>

          <div
            style={{
              fontSize: FONT.size.xs,
              color: COLORS.text.secondary,
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span>{node.sourceName || 'Source'}</span>
            <i className="fa-solid fa-arrow-right" style={{ fontSize: 9, color: COLORS.text.tertiary }} />
            <span>{node.targetName || 'Target'}</span>
            <span style={{ color: COLORS.text.tertiary }}>·</span>
            <span>{node.tableCount ?? 0} tables</span>
          </div>

          {failureBadge && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: FONT.weight.medium,
                  padding: '1px 7px',
                  borderRadius: BORDER_RADIUS.pill,
                  background: failureBadge.bg,
                  color: failureBadge.color,
                }}
              >
                {failureBadge.label}
              </span>
            </div>
          )}

          {mode === 'monitor' && (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  height: 5,
                  borderRadius: BORDER_RADIUS.pill,
                  background: COLORS.background.tertiary,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, node.progress || 0))}%`,
                    height: '100%',
                    background:
                      status === 'ERRORED'
                        ? COLORS.status.error
                        : status === 'COMPLETED'
                          ? COLORS.status.success
                          : COLORS.brand.primary,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: COLORS.text.tertiary,
                  marginTop: 4,
                }}
              >
                <span>{(node.rowsProcessed || 0).toLocaleString()} rows</span>
                <span>{Math.round(node.progress || 0)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom output connector port */}
      {mode === 'builder' && (
        <div
          title="Drag or click to link successor pipeline"
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onStartConnect) onStartConnect(node.pipelineId, e);
          }}
          style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: COLORS.background.primary,
            border: `2px solid ${COLORS.brand.primary}`,
            zIndex: 3,
            cursor: 'crosshair',
          }}
        />
      )}
    </div>
  );
};

export default WorkflowNodeCard;

