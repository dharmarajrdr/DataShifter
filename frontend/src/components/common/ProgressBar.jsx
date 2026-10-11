import { COLORS, FONT, SPACING } from '../../constants/design';
import { FRSC } from '../../constants/layouts';

const STATUS_COLORS = {
  RUNNING: COLORS.status.success,
  COMPLETED: COLORS.brand.primary,
  READY: COLORS.status.info,
  ERRORED: COLORS.status.error,
  FAILED: COLORS.status.error,
  PAUSED: COLORS.status.warning,
  STOPPED: COLORS.text.tertiary,
};

const ProgressBar = ({ progress, value, status = 'RUNNING', height = '6px', showLabel = true }) => {
  const numericProgress = Number(progress ?? value ?? 0);
  const barColor = STATUS_COLORS[status] || COLORS.brand.primary;
  const formattedProgress = parseFloat(numericProgress.toFixed(2));
  return (
    <div style={{ ...FRSC, gap: SPACING.xs, width: '100%' }}>
      <div style={{
        flex: 1,
        height,
        background: COLORS.background.tertiary,
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${numericProgress}%`,
          height: '100%',
          background: barColor,
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, minWidth: '36px', textAlign: 'right' }}>
          {formattedProgress}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
