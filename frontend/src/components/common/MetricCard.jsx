import React from 'react';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../../constants/design';
import { FCSS } from '../../constants/layouts';

const MetricCard = ({ label, value, color, centered = false }) => (
  <div style={{
    ...FCSS,
    alignItems: centered ? 'center' : 'flex-start',
    background: COLORS.background.secondary,
    borderRadius: BORDER_RADIUS.md,
    padding: `${SPACING.sm} ${SPACING.md}`,
    flex: 1,
    minWidth: 0,
  }}>
    <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
      {label}
    </span>
    <span style={{
      fontSize: '20px',
      fontWeight: FONT.weight.medium,
      marginTop: SPACING.xxs,
      color: color || COLORS.text.primary,
    }}>
      {value}
    </span>
  </div>
);

export default MetricCard;
