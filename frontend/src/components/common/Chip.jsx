import React from 'react';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../../constants/design';

const COLOR_MAP = {
  purple: { bg: COLORS.accent.purpleLight, color: COLORS.accent.purpleText, border: '#AFA9EC' },
  teal: { bg: COLORS.accent.tealLight, color: COLORS.accent.tealText, border: '#5DCAA5' },
  coral: { bg: COLORS.accent.coralLight, color: COLORS.accent.coralText, border: '#F0997B' },
  success: { bg: COLORS.status.successLight, color: COLORS.status.successText, border: '#5DCAA5' },
  error: { bg: COLORS.status.errorLight, color: COLORS.status.errorText, border: '#F09595' },
  warning: { bg: COLORS.status.warningLight, color: COLORS.status.warningText, border: '#FAC775' },
  default: { bg: COLORS.background.secondary, color: COLORS.text.secondary, border: COLORS.border.light },
};

const Chip = ({ label, colorScheme = 'default', bordered = false, onClick, style: customStyle = {} }) => {
  const scheme = COLOR_MAP[colorScheme] || COLOR_MAP.default;
  return (
    <span
      onClick={onClick}
      style={{
        background: scheme.bg,
        color: scheme.color,
        fontSize: FONT.size.xs,
        padding: `${SPACING.xxs} ${SPACING.sm}`,
        borderRadius: BORDER_RADIUS.md,
        fontWeight: FONT.weight.medium,
        border: bordered ? `1px solid ${scheme.border}` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        ...customStyle,
      }}
    >
      {label}
    </span>
  );
};

export default Chip;
