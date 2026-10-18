import { BORDER_RADIUS, COLORS, FONT } from '../../constants/design';

const STATUS_MAP = {
  RUNNING: { bg: COLORS.status.successLight, color: COLORS.status.successText },
  COMPLETED: { bg: COLORS.accent.teal, color: COLORS.accent.indigoLight },
  ERRORED: { bg: COLORS.status.errorLight, color: COLORS.status.errorText },
  PAUSED: { bg: COLORS.status.warningLight, color: COLORS.status.warningText },
  DRAFT: { bg: COLORS.background.tertiary, color: COLORS.text.secondary, label: 'Draft' },
  NOT_VALIDATED: { bg: COLORS.background.tertiary, color: COLORS.text.secondary, label: 'Not Validated' },
  VALIDATED: { bg: COLORS.status.infoLight, color: COLORS.status.infoText, label: 'Validated' },
  INVALID: { bg: COLORS.status.errorLight, color: COLORS.status.errorText, label: 'Invalid' },
  CREATED: { bg: COLORS.background.tertiary, color: COLORS.text.secondary, label: 'Created' },
  CONNECTED: { bg: COLORS.status.successLight, color: COLORS.status.successText },
  FAILED: { bg: COLORS.status.errorLight, color: COLORS.status.errorText },
  TESTING: { bg: COLORS.status.warningLight, color: COLORS.status.warningText },
  PENDING: { bg: COLORS.background.tertiary, color: COLORS.text.secondary },
  READY: { bg: COLORS.status.infoLight, color: COLORS.status.infoText, label: 'Ready' },
  STOPPED: { bg: COLORS.status.warningLight, color: COLORS.status.warningText, label: 'Stopped' },
  SKIPPED: { bg: COLORS.background.tertiary, color: COLORS.text.secondary, label: 'Skipped' },
  OK: { bg: COLORS.status.successLight, color: COLORS.status.successText },
  ERROR: { bg: COLORS.status.errorLight, color: COLORS.status.errorText },
};

const StatusBadge = ({ id, className = '', style = {}, status, label }) => {
  const scheme = STATUS_MAP[status?.toUpperCase()] || STATUS_MAP.DRAFT;
  return (
    <span
      id={id}
      className={`ds-status-badge ${className}`}
      style={{
        background: scheme.bg,
        color: scheme.color,
        fontSize: FONT.size.xs,
        minWidth: '80px',
        display: 'inline-block',
        textAlign: 'center',
        padding: '3px 10px',
        borderRadius: BORDER_RADIUS.pill,
        fontWeight: FONT.weight.medium,
        whiteSpace: 'nowrap',
        lineHeight: '15px',
        border: `1px solid ${scheme.color}`,
        ...style,
      }}
    >
      {label || scheme.label || status}
    </span>
  );
};

export default StatusBadge;
