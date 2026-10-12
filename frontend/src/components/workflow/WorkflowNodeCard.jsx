import { BORDER_RADIUS, COLORS, FONT, SHADOWS } from '../../constants/design';

const WorkflowNodeCard = ({
  node,
  stepNumber,
  isTrigger = false,
  selected = false,
  isRunningNode = false,
  mode = 'builder', // 'builder' | 'monitor'
  onClick,
  onMouseDown,
  onStartConnect,
  onCompleteConnect,
  onRemove,
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
            Executes linked pipelines in series &amp; parallel
          </div>
        </div>
      </div>
    );
  }

  const status = node.pipelineStatus || 'VALIDATED';

  const getIconConfig = () => {
    if (isRunningNode || status === 'RUNNING') {
      return {
        bg: COLORS.status.infoLight,
        color: COLORS.status.infoDark,
        borderColor: COLORS.status.info,
        glow: 'rgba(24, 95, 165, 0.18)',
        icon: 'fa-solid fa-spinner fa-spin',
      };
    }
    if (status === 'COMPLETED') {
      return {
        bg: COLORS.status.successLight,
        color: COLORS.status.successDark,
        borderColor: COLORS.status.success,
        glow: 'rgba(29, 158, 117, 0.18)',
        icon: 'fa-solid fa-circle-check',
      };
    }
    if (status === 'ERRORED' || status === 'INVALID' || status === 'FAILED') {
      return {
        bg: COLORS.status.errorLight,
        color: COLORS.status.errorDark,
        borderColor: COLORS.status.error,
        glow: 'rgba(216, 90, 48, 0.18)',
        icon: 'fa-solid fa-triangle-exclamation',
      };
    }
    if (status === 'PAUSED' || status === 'STOPPED' || status === 'SKIPPED') {
      return {
        bg: COLORS.status.warningLight,
        color: COLORS.status.warningDark,
        borderColor: COLORS.status.warning,
        glow: 'rgba(217, 119, 6, 0.18)',
        icon: 'fa-solid fa-ban',
      };
    }
    if (status === 'DRAFT' || status === 'NOT_VALIDATED') {
      return {
        bg: COLORS.background.tertiary,
        color: COLORS.text.secondary,
        borderColor: COLORS.border.medium,
        glow: 'rgba(0, 0, 0, 0.08)',
        icon: 'fa-solid fa-circle-dot',
      };
    }
    // VALIDATED (Ready to run)
    return {
      bg: COLORS.status.infoLight,
      color: COLORS.status.infoDark,
      borderColor: COLORS.status.info,
      glow: 'rgba(24, 95, 165, 0.16)',
      icon: 'fa-solid fa-diagram-project',
    };
  };

  const iconCfg = getIconConfig();

  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      style={{
        width: 310,
        background: COLORS.background.primary,
        border: selected
          ? `2px solid ${iconCfg.color}`
          : isRunningNode
            ? `2px solid ${COLORS.status.info}`
            : `1.5px solid ${iconCfg.borderColor}`,
        borderRadius: BORDER_RADIUS.lg,
        boxShadow: selected || isRunningNode
          ? `0 0 0 4px ${iconCfg.glow}, ${SHADOWS.md}`
          : SHADOWS.sm,
        position: 'relative',
        cursor: mode === 'builder' ? 'grab' : 'pointer',
        userSelect: 'none',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Top-left remove step icon (shown only when step is selected) */}
      {mode === 'builder' && selected && onRemove && (
        <button
          type="button"
          title="Remove step from workflow"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(node.pipelineId);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.status.error;
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = COLORS.status.error;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = COLORS.background.primary;
            e.currentTarget.style.color = COLORS.text.secondary;
            e.currentTarget.style.borderColor = COLORS.border.medium;
          }}
          style={{
            position: 'absolute',
            top: -8,
            left: -8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: COLORS.background.primary,
            border: `1.5px solid ${COLORS.border.medium}`,
            color: COLORS.text.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            zIndex: 4,
            cursor: 'pointer',
            boxShadow: SHADOWS.sm,
            transition: 'all 0.12s ease',
          }}
        >
          <i className="fa-solid fa-xmark" style={{ fontSize: 10, lineHeight: 1 }} />
        </button>
      )}

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

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          minHeight: 54,
          overflow: 'hidden',
          borderRadius: BORDER_RADIUS.lg,
        }}
      >
        {/* Left icon well */}
        <div
          style={{
            width: 54,
            background: iconCfg.bg,
            borderRight: `1.5px solid ${iconCfg.borderColor}`,
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
        <div
          style={{
            padding: '11px 14px',
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
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

