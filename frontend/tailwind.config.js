/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          light: '#EEF2FF',
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          DEFAULT: '#FFFFFF',
        },
        content: {
          primary: '#0F172A',
          secondary: '#64748B',
          tertiary: '#94A3B8',
          muted: '#94A3B8',
        },
        status: {
          success: '#059669',
          'success-bg': '#ECFDF5',
          'success-border': '#A7F3D0',
          warning: '#D97706',
          'warning-bg': '#FFFBEB',
          'warning-border': '#FDE68A',
          danger: '#DC2626',
          'danger-bg': '#FEF2F2',
          'danger-border': '#FECACA',
          info: '#0284C7',
          'info-bg': '#F0F9FF',
          'info-border': '#BAE6FD',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
