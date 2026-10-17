import React from 'react';
import { FONT, COLORS, SPACING, BORDER_RADIUS } from '../../../constants/design';
import { FRBC } from '../../../constants/layouts';

export const SectionTitle = ({ title, subtitle }) => (
  <div style={{ marginBottom: SPACING.md }}>
    <h3 style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.semibold, color: COLORS.text.primary, margin: 0 }}>
      {title}
    </h3>
    {subtitle && (
      <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px', marginBottom: 0 }}>
        {subtitle}
      </p>
    )}
  </div>
);

export const SettingRow = ({ label, description, children }) => (
  <div
    style={{
      ...FRBC,
      padding: `${SPACING.sm} ${SPACING.md}`,
      background: COLORS.background.secondary,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.xs,
    }}
  >
    <div>
      <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, margin: 0 }}>{label}</p>
      {description && (
        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px', margin: 0 }}>
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);
