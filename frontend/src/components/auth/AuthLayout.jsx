import React from 'react';
import { Outlet } from 'react-router-dom';
import { COLORS, FONT, BORDER_RADIUS } from '../../constants/design';

const AuthLayout = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: COLORS.background.secondary,
  }}>
    <div style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: COLORS.brand.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h4l2-4 2 8 2-4h2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: '22px', color: COLORS.text.primary }}>Datashifter</span>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: COLORS.background.primary, borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${COLORS.border.light}`, padding: '32px',
      }}>
        <Outlet />
      </div>

      {/* Footer */}
      <p style={{
        textAlign: 'center', fontSize: '12px', color: COLORS.text.tertiary, marginTop: '24px',
      }}>
        Database migration, simplified.
      </p>
    </div>
  </div>
);

export default AuthLayout;