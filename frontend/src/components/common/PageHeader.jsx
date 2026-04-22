import React from 'react';
import { COLORS, FONT, SPACING } from '../../constants/design';
import { FRBC } from '../../constants/layouts';

const PageHeader = ({ title, subtitle, actions, breadcrumbs, headerStyles }) => (
  <div style={{ marginBottom: SPACING.lg, ...headerStyles }}>
    {breadcrumbs && (
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs }}>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: COLORS.text.tertiary }}>/</span>}
            <span style={{
              fontSize: FONT.size.md,
              color: i === breadcrumbs.length - 1 ? COLORS.text.primary : COLORS.text.secondary,
              fontWeight: i === breadcrumbs.length - 1 ? FONT.weight.medium : FONT.weight.regular,
              cursor: crumb.onClick ? 'pointer' : 'default',
            }} onClick={crumb.onClick}>
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </div>
    )}
    <div style={{...FRBC}}>
      <div>
        <h1 style={{ fontSize: FONT.size.xl, fontWeight: FONT.weight.medium, color: COLORS.text.primary }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: FONT.size.md, color: COLORS.text.secondary, marginTop: SPACING.xxs }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: SPACING.xs, alignItems: 'center' }}>{actions}</div>}
    </div>
  </div>
);

export default PageHeader;
