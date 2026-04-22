import React from 'react';

export const LogoIcon = () => (
  <div style={{
    width: 28, height: 28, borderRadius: 6, background: '#534AB7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8h4l2-4 2 8 2-4h2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

export const PipelineIcon = ({ color = '#6B6B6B', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3"/>
  </svg>
);

export const ConnectionIcon = ({ color = '#6B6B6B', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <ellipse cx="8" cy="4.5" rx="5.5" ry="2.5" stroke={color} strokeWidth="1.3"/>
    <path d="M2.5 4.5v7c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5v-7" stroke={color} strokeWidth="1.3"/>
    <path d="M2.5 8c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5" stroke={color} strokeWidth="1.3"/>
  </svg>
);

export const MonitorIcon = ({ color = '#6B6B6B', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2" width="13" height="9" rx="1.5" stroke={color} strokeWidth="1.3"/>
    <path d="M5 14h6M8 11v3" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const SettingsIcon = ({ color = '#6B6B6B', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke={color} strokeWidth="1.3"/>
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export const DragIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="4" cy="3" r="1" fill="#9B9B9B"/><circle cx="8" cy="3" r="1" fill="#9B9B9B"/>
    <circle cx="4" cy="6" r="1" fill="#9B9B9B"/><circle cx="8" cy="6" r="1" fill="#9B9B9B"/>
    <circle cx="4" cy="9" r="1" fill="#9B9B9B"/><circle cx="8" cy="9" r="1" fill="#9B9B9B"/>
  </svg>
);

export const CloseIcon = ({ color = '#6B6B6B', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M3 3l8 8M11 3l-8 8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const WarningIcon = ({ color = '#854F0B', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M7 1L1 13h12L7 1z" stroke={color} strokeWidth="1.2" fill="none"/>
    <path d="M7 5.5v3" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="7" cy="10.5" r="0.6" fill={color}/>
  </svg>
);

export const SpannerIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path d="M9 2L3 6v6l6 4 6-4V6L9 2z" stroke="#185FA5" strokeWidth="1.2" fill="none"/>
    <path d="M9 10V6M6 8l3 2 3-2" stroke="#185FA5" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const OracleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <ellipse cx="9" cy="5" rx="6" ry="2.5" stroke="#A32D2D" strokeWidth="1.2" fill="none"/>
    <path d="M3 5v8c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V5" stroke="#A32D2D" strokeWidth="1.2" fill="none"/>
    <path d="M3 9c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" stroke="#A32D2D" strokeWidth="1.2" fill="none"/>
  </svg>
);

export const PostgresIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <ellipse cx="9" cy="5" rx="6" ry="2.5" stroke="#0F6E56" strokeWidth="1.2" fill="none"/>
    <path d="M3 5v8c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V5" stroke="#0F6E56" strokeWidth="1.2" fill="none"/>
    <path d="M3 9c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" stroke="#0F6E56" strokeWidth="1.2" fill="none"/>
    <path d="M7 7v4M9 6v5M11 7v4" stroke="#0F6E56" strokeWidth="0.8" strokeLinecap="round"/>
  </svg>
);

export const ProfileIcon = ({ color = '#6B6B6B', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="3" stroke={color} strokeWidth="1.3"/>
    <path d="M2.5 14c0-2.76 2.46-5 5.5-5s5.5 2.24 5.5 5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);