import React from 'react';
import { COLORS } from '../../constants/design';

const Toggle = ({ checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      width: '40px',
      height: '22px',
      borderRadius: '11px',
      background: checked ? COLORS.brand.primary : COLORS.border.medium,
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s ease',
      flexShrink: 0,
    }}
  >
    <div style={{
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: '#fff',
      position: 'absolute',
      top: '2px',
      left: checked ? '20px' : '2px',
      transition: 'left 0.2s ease',
    }} />
  </div>
);

export default Toggle;
