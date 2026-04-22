import { COLORS, FONT, SPACING } from '../../constants/design';
import { FRSC } from '../../constants/layouts';

const STATUS_COLORS = {
  RUNNING: COLORS.status.success,
  COMPLETED: COLORS.brand.primary,
  ERRORED: COLORS.status.error,
  PAUSED: COLORS.status.warning,
};

const ProgressBar = ({ progress, status = 'RUNNING', height = '6px', showLabel = true }) => {
  const barColor = STATUS_COLORS[status] || COLORS.brand.primary;
  const formattedProgress = parseFloat(progress.toFixed(2));
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
          width: `${progress}%`,
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
