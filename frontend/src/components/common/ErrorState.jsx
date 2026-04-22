import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { Button } from '../common';

/* ================================================================
   SVG ILLUSTRATIONS — one per error type
   ================================================================ */

/** Shield with lock — permission denied */
const PermissionDeniedIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    {/* Shield */}
    <path d="M60 10 L95 28 V58 C95 82 78 100 60 110 C42 100 25 82 25 58 V28 Z"
      stroke="#E24B4A" strokeWidth="1.5" fill="#FCEBEB" />
    {/* Lock body */}
    <rect x="45" y="55" width="30" height="24" rx="4" stroke="#A32D2D" strokeWidth="1.5" fill="#FCEBEB" />
    {/* Lock shackle */}
    <path d="M50 55 V47 C50 40 54 36 60 36 C66 36 70 40 70 47 V55"
      stroke="#A32D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Keyhole */}
    <circle cx="60" cy="65" r="3" fill="#A32D2D" />
    <rect x="59" y="67" width="2" height="5" rx="1" fill="#A32D2D" />
  </svg>
);

/** Server rack with X — server down */
const ServerDownIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    {/* Server box */}
    <rect x="25" y="20" width="70" height="80" rx="8" stroke="#BA7517" strokeWidth="1.5" fill="#FAEEDA" />
    {/* Rack lines */}
    <line x1="25" y1="46" x2="95" y2="46" stroke="#BA7517" strokeWidth="0.8" />
    <line x1="25" y1="72" x2="95" y2="72" stroke="#BA7517" strokeWidth="0.8" />
    {/* LEDs row 1 */}
    <circle cx="38" cy="33" r="3" fill="#BA7517" opacity="0.4" />
    <circle cx="48" cy="33" r="3" fill="#BA7517" opacity="0.4" />
    <rect x="70" y="30" width="16" height="6" rx="1" stroke="#BA7517" strokeWidth="0.6" fill="none" />
    {/* LEDs row 2 */}
    <circle cx="38" cy="59" r="3" fill="#BA7517" opacity="0.4" />
    <circle cx="48" cy="59" r="3" fill="#BA7517" opacity="0.4" />
    <rect x="70" y="56" width="16" height="6" rx="1" stroke="#BA7517" strokeWidth="0.6" fill="none" />
    {/* LEDs row 3 */}
    <circle cx="38" cy="85" r="3" fill="#BA7517" opacity="0.4" />
    <circle cx="48" cy="85" r="3" fill="#BA7517" opacity="0.4" />
    <rect x="70" y="82" width="16" height="6" rx="1" stroke="#BA7517" strokeWidth="0.6" fill="none" />
    {/* X overlay */}
    <circle cx="82" cy="28" r="14" fill="#FAEEDA" stroke="#BA7517" strokeWidth="1.5" />
    <path d="M76 22 L88 34 M88 22 L76 34" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Broken cable — network error */
const NetworkErrorIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    {/* Left device */}
    <rect x="10" y="40" width="30" height="40" rx="4" stroke="#534AB7" strokeWidth="1.5" fill="#EEEDFE" />
    <circle cx="25" cy="55" r="3" fill="#534AB7" opacity="0.5" />
    <rect x="16" y="64" width="18" height="3" rx="1" fill="#534AB7" opacity="0.3" />
    <rect x="16" y="70" width="12" height="3" rx="1" fill="#534AB7" opacity="0.3" />
    {/* Right device */}
    <rect x="80" y="40" width="30" height="40" rx="4" stroke="#534AB7" strokeWidth="1.5" fill="#EEEDFE" />
    <circle cx="95" cy="55" r="3" fill="#534AB7" opacity="0.5" />
    <rect x="86" y="64" width="18" height="3" rx="1" fill="#534AB7" opacity="0.3" />
    <rect x="86" y="70" width="12" height="3" rx="1" fill="#534AB7" opacity="0.3" />
    {/* Broken cable left */}
    <path d="M40 60 C48 60, 50 52, 54 48" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
    {/* Broken cable right */}
    <path d="M66 72 C70 68, 72 60, 80 60" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
    {/* Lightning bolt (break point) */}
    <path d="M56 44 L52 56 L58 54 L54 66" stroke="#E24B4A" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Generic error — warning triangle */
const GenericErrorIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <path d="M60 20 L105 95 H15 Z" stroke="#BA7517" strokeWidth="1.5" fill="#FAEEDA" strokeLinejoin="round" />
    <line x1="60" y1="50" x2="60" y2="72" stroke="#854F0B" strokeWidth="3" strokeLinecap="round" />
    <circle cx="60" cy="82" r="2.5" fill="#854F0B" />
  </svg>
);

/* ================================================================
   ERROR PRESETS
   ================================================================ */

const ERROR_PRESETS = {
  'permission-denied': {
    illustration: PermissionDeniedIllustration,
    title: 'Access denied',
    description: "You don't have permission to access this page. Contact your organization admin to request the required permissions.",
    bgColor: COLORS.status.errorLight,
    accentColor: COLORS.status.errorDark,
  },
  'server-down': {
    illustration: ServerDownIllustration,
    title: 'Server unavailable',
    description: "We couldn't reach the server. This might be a temporary issue — the service could be restarting or under maintenance.",
    bgColor: COLORS.status.warningLight,
    accentColor: COLORS.status.warningDark,
  },
  'network-error': {
    illustration: NetworkErrorIllustration,
    title: 'No connection',
    description: "It looks like you're offline or the network is unreachable. Check your internet connection and try again.",
    bgColor: COLORS.brand.primaryLight,
    accentColor: COLORS.brand.primary,
  },
  'not-found': {
    illustration: GenericErrorIllustration,
    title: 'Page not found',
    description: "The page you're looking for doesn't exist or has been moved.",
    bgColor: COLORS.status.warningLight,
    accentColor: COLORS.status.warningDark,
  },
  'generic': {
    illustration: GenericErrorIllustration,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
    bgColor: COLORS.status.warningLight,
    accentColor: COLORS.status.warningDark,
  },
};

/* ================================================================
   ERROR STATE COMPONENT
   ================================================================ */

/**
 * Reusable full-page error state component.
 *
 * @param {string} type - Error type: 'permission-denied' | 'server-down' | 'network-error' | 'not-found' | 'generic'
 * @param {string} [title] - Override default title
 * @param {string} [description] - Override default description
 * @param {string} [details] - Technical error details (shown in expandable section)
 * @param {Function} [onRetry] - Retry callback (shows "Try again" button)
 * @param {boolean} [showHome=true] - Show "Go to dashboard" button
 * @param {boolean} [showBack=true] - Show "Go back" button
 * @param {React.ReactNode} [actions] - Custom action buttons
 *
 * @example
 *   <ErrorState type="permission-denied" />
 *   <ErrorState type="server-down" onRetry={() => window.location.reload()} />
 *   <ErrorState type="network-error" onRetry={refetch} />
 *   <ErrorState type="generic" title="Pipeline failed" description="Check error logs for details." />
 */
const ErrorState = ({
  type = 'generic',
  title,
  description,
  details,
  onRetry,
  showHome = true,
  showBack = true,
  actions,
}) => {
  const navigate = useNavigate();
  const preset = ERROR_PRESETS[type] || ERROR_PRESETS.generic;
  const Illustration = preset.illustration;
  const displayTitle = title || preset.title;
  const displayDesc = description || preset.description;
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: SPACING.xl, textAlign: 'center',
    }}>
      {/* Illustration with background circle */}
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        background: preset.bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '28px',
      }}>
        <Illustration />
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: '22px', fontWeight: 500, color: COLORS.text.primary,
        margin: '0 0 8px',
      }}>
        {displayTitle}
      </h2>

      {/* Description */}
      <p style={{
        fontSize: FONT.size.md, color: COLORS.text.secondary,
        maxWidth: '420px', lineHeight: 1.6, margin: '0 0 24px',
      }}>
        {displayDesc}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <Button onClick={onRetry}>Try again</Button>
        )}
        {showBack && (
          <Button variant="secondary" onClick={() => navigate(-1)}>Go back</Button>
        )}
        {showHome && (
          <Button variant="secondary" onClick={() => navigate('/pipelines')}>Go to dashboard</Button>
        )}
        {actions}
      </div>

      {/* Technical details (expandable) */}
      {details && (
        <div style={{ marginTop: '24px', maxWidth: '500px', width: '100%' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: FONT.size.xs, color: COLORS.text.tertiary,
              display: 'flex', alignItems: 'center', gap: '4px',
              margin: '0 auto',
            }}
          >
            <span style={{ fontSize: '10px' }}>{showDetails ? '▼' : '▶'}</span>
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          {showDetails && (
            <pre style={{
              marginTop: SPACING.xs, padding: SPACING.sm,
              background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.md,
              fontSize: '11px', color: COLORS.text.secondary,
              textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              border: `1px solid ${COLORS.border.light}`,
              maxHeight: '200px', overflow: 'auto',
            }}>
              {details}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorState;