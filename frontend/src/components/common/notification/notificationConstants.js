import React from 'react';
import { COLORS } from '../../../constants/design';

export const NOTIFICATION_VARIANTS = {
  success: {
    bg: COLORS.status.successLight,
    border: COLORS.status.success,
    color: COLORS.status.successText,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  error: {
    bg: COLORS.status.errorLight,
    border: COLORS.status.error,
    color: COLORS.status.errorText,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    bg: COLORS.status.infoLight,
    border: COLORS.status.info,
    color: COLORS.status.infoText,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    bg: COLORS.status.warningLight,
    border: COLORS.status.warning,
    color: COLORS.status.warningText,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
};

export const POSITIONS = {
  'top-right': {
    top: 'var(--notification-position-top, 20px)',
    right: 'var(--notification-position-right, 20px)',
  },
  'top-left': {
    top: 'var(--notification-position-top, 20px)',
    left: 'var(--notification-position-left, 20px)',
  },
  'top-center': {
    top: 'var(--notification-position-top, 20px)',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  'bottom-right': {
    bottom: 'var(--notification-position-bottom, 20px)',
    right: 'var(--notification-position-right, 20px)',
  },
  'bottom-left': {
    bottom: 'var(--notification-position-bottom, 20px)',
    left: 'var(--notification-position-left, 20px)',
  },
  'bottom-center': {
    bottom: 'var(--notification-position-bottom, 20px)',
    left: '50%',
    transform: 'translateX(-50%)',
  },
};
