import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRBC } from '../../constants/layouts';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Sticky settings header: title + subtitle + optional actions on top, tabs below.
 * Props: title, subtitle, actions (optional)
 */
const SettingsTabs = ({ title, subtitle, actions }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const tabs = [
    { label: 'Organization', path: '/settings/org', show: true },
    { label: 'Members', path: '/settings/members', show: hasPermission('org:manage_members') || hasPermission('org:manage_invites') || !!user?.orgOwner },
    { label: 'Roles', path: '/settings/roles', show: hasPermission('org:manage_roles') },
    { label: 'Billing', path: '/settings/billing', show: !!user?.orgOwner },
  ];

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: '#fff',
      margin: `-${SPACING.xl} -${SPACING.xl} 0`,
      padding: `${SPACING.xl} ${SPACING.xl} 0`,
    }}>
      {/* Header */}
      <div style={{ ...FRBC, marginBottom: SPACING.sm }}>
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

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '2px',
        borderBottom: `1px solid ${COLORS.border.light}`,
      }}>
        {tabs.filter(t => t.show).map(tab => {
          const active = pathname === tab.path;
          return (
            <div key={tab.path} onClick={() => navigate(tab.path)}
              style={{
                padding: `${SPACING.xs} ${SPACING.md}`,
                fontSize: FONT.size.sm, fontWeight: active ? 600 : 400, cursor: 'pointer',
                color: active ? COLORS.brand.primary : COLORS.text.secondary,
                borderBottom: `2px solid ${active ? COLORS.brand.primary : 'transparent'}`,
                marginBottom: '-1px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = COLORS.text.primary; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = COLORS.text.secondary; }}>
              {tab.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsTabs;