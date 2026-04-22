/* ============================================================
   DESIGN TOKENS — single source of truth for all visual values
   ============================================================ */

export const COLORS = {
  brand: {
    primary: '#534AB7',
    primaryLight: '#EEEDFE',
    primaryDark: '#3C3489',
    primaryHover: '#6359C7',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#6B6B6B',
    tertiary: '#9B9B9B',
    inverse: '#FFFFFF',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F7F7F5',
    tertiary: '#EFEFEC',
  },
  border: {
    light: '#E8E8E5',
    medium: '#D4D4D0',
    dark: '#B0B0AB',
  },
  status: {
    success: '#1D9E75',
    successLight: '#E1F5EE',
    successDark: '#0F6E56',
    successText: '#085041',
    warning: '#BA7517',
    warningLight: '#FAEEDA',
    warningDark: '#854F0B',
    warningText: '#633806',
    error: '#E24B4A',
    errorLight: '#FCEBEB',
    errorDark: '#A32D2D',
    errorText: '#791F1F',
    info: '#378ADD',
    infoLight: '#E6F1FB',
    infoDark: '#185FA5',
    infoText: '#0C447C',
  },
  accent: {
    purple: '#534AB7',
    purpleLight: '#EEEDFE',
    purpleText: '#3C3489',
    teal: '#1D9E75',
    tealLight: '#E1F5EE',
    tealText: '#085041',
    coral: '#D85A30',
    coralLight: '#FAECE7',
    coralText: '#712B13',
    amber: '#BA7517',
    amberLight: '#FAEEDA',
    amberText: '#633806',
  },
};

export const SPACING = {
  xxs: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  xxl: '32px',
  xxxl: '40px',
};

export const FONT = {
  family: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  size: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    base: '14px',
    lg: '15px',
    xl: '18px',
    xxl: '22px',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
  },
};

export const BORDER_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '99px',
};

export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.04)',
  md: '0 2px 8px rgba(0,0,0,0.06)',
};

export const SIDEBAR_WIDTH = '220px';
export const HEADER_HEIGHT = '52px';
