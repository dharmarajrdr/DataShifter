import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../constants/design';
import Button from '../components/common/Button';

/* ================================================================
   SVG ILLUSTRATIONS
   ================================================================ */

/** 403: Shield with lock */
export const ForbiddenIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    {/* Shield */}
    <path
      d="M60 10 L95 28 V58 C95 82 78 100 60 110 C42 100 25 82 25 58 V28 Z"
      stroke="#E24B4A"
      strokeWidth="1.5"
      fill="#FCEBEB"
    />
    {/* Lock body */}
    <rect x="45" y="55" width="30" height="24" rx="4" stroke="#A32D2D" strokeWidth="1.5" fill="#FFFFFF" />
    {/* Lock shackle */}
    <path
      d="M50 55 V47 C50 40 54 36 60 36 C66 36 70 40 70 47 V55"
      stroke="#A32D2D"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Keyhole */}
    <circle cx="60" cy="65" r="3" fill="#A32D2D" />
    <rect x="59" y="67" width="2" height="5" rx="1" fill="#A32D2D" />
  </svg>
);

/** 404: Magnifying glass and map pin */
export const NotFoundIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    {/* Folded map background */}
    <path
      d="M20 32 L46 22 L74 32 L100 22 V88 L74 98 L46 88 L20 98 Z"
      stroke="#534AB7"
      strokeWidth="1.5"
      fill="#EEEDFE"
      strokeLinejoin="round"
    />
    <line x1="46" y1="22" x2="46" y2="88" stroke="#534AB7" strokeWidth="1" strokeDasharray="3 3" />
    <line x1="74" y1="32" x2="74" y2="98" stroke="#534AB7" strokeWidth="1" strokeDasharray="3 3" />
    {/* Magnifying glass circle */}
    <circle cx="60" cy="56" r="22" stroke="#3C3489" strokeWidth="2" fill="#FFFFFF" />
    {/* Handle */}
    <line x1="76" y1="72" x2="94" y2="90" stroke="#3C3489" strokeWidth="3" strokeLinecap="round" />
    {/* Question / 404 sign inside */}
    <text
      x="60"
      y="62"
      textAnchor="middle"
      fontSize="13"
      fontWeight="700"
      fontFamily="'DM Sans', sans-serif"
      fill="#534AB7"
    >
      404
    </text>
  </svg>
);

/** 500: Server rack with warning overlay */
export const ServerErrorIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    {/* Server box */}
    <rect x="25" y="20" width="70" height="80" rx="8" stroke="#BA7517" strokeWidth="1.5" fill="#FAEEDA" />
    {/* Rack lines */}
    <line x1="25" y1="46" x2="95" y2="46" stroke="#BA7517" strokeWidth="0.8" />
    <line x1="25" y1="72" x2="95" y2="72" stroke="#BA7517" strokeWidth="0.8" />
    {/* LEDs */}
    <circle cx="38" cy="33" r="3" fill="#BA7517" opacity="0.4" />
    <circle cx="48" cy="33" r="3" fill="#BA7517" opacity="0.4" />
    <rect x="70" y="30" width="16" height="6" rx="1" stroke="#BA7517" strokeWidth="0.6" fill="none" />
    <circle cx="38" cy="59" r="3" fill="#BA7517" opacity="0.4" />
    <circle cx="48" cy="59" r="3" fill="#BA7517" opacity="0.4" />
    <rect x="70" y="56" width="16" height="6" rx="1" stroke="#BA7517" strokeWidth="0.6" fill="none" />
    <circle cx="38" cy="85" r="3" fill="#BA7517" opacity="0.4" />
    <circle cx="48" cy="85" r="3" fill="#BA7517" opacity="0.4" />
    <rect x="70" y="82" width="16" height="6" rx="1" stroke="#BA7517" strokeWidth="0.6" fill="none" />
    {/* Warning badge */}
    <circle cx="84" cy="28" r="14" fill="#FAEEDA" stroke="#BA7517" strokeWidth="1.5" />
    <path d="M78 22 L90 34 M90 22 L78 34" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ================================================================
   ERROR STATUS CONFIGURATIONS
   ================================================================ */

const STATUS_CONFIGS = {
  403: {
    code: '403',
    badge: '403 FORBIDDEN',
    badgeBg: COLORS.status.errorLight,
    badgeColor: COLORS.status.errorDark,
    circleBg: COLORS.status.errorLight,
    title: 'Access denied',
    description: "You don't have permission to access this page. Contact your organization administrator to request the required permissions.",
    Illustration: ForbiddenIllustration,
  },
  404: {
    code: '404',
    badge: '404 NOT FOUND',
    badgeBg: COLORS.brand.primaryLight,
    badgeColor: COLORS.brand.primaryDark,
    circleBg: COLORS.brand.primaryLight,
    title: 'Page not found',
    description: "The page you're looking for doesn't exist or has been moved.",
    Illustration: NotFoundIllustration,
  },
  500: {
    code: '500',
    badge: '500 SERVER ERROR',
    badgeBg: COLORS.status.warningLight,
    badgeColor: COLORS.status.warningDark,
    circleBg: COLORS.status.warningLight,
    title: 'Internal server error',
    description: 'Something went wrong on our servers. This might be a temporary issue while services restart or are under maintenance.',
    Illustration: ServerErrorIllustration,
  },
};

/* ================================================================
   UNIVERSAL ERROR PAGE COMPONENT
   ================================================================ */

export const ErrorPage = ({
  status = 500,
  code,
  title,
  message,
  description,
  missingPermission,
  details,
  onRetry,
  showHome = true,
  showBack = true,
  homePath = '/pipelines',
  actions,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  const statusCode = Number(code || status) || 500;
  const config = STATUS_CONFIGS[statusCode] || STATUS_CONFIGS[500];

  const displayTitle = title || config.title;
  const displayDescription = message || description || config.description;
  const Illustration = config.Illustration;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: compact ? '40vh' : '65vh',
        padding: compact ? SPACING.md : SPACING.xl,
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Circle illustration */}
      <div
        style={{
          width: compact ? 120 : 160,
          height: compact ? 120 : 160,
          borderRadius: '50%',
          background: config.circleBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: SPACING.md,
          transform: compact ? 'scale(0.85)' : 'none',
        }}
      >
        <Illustration />
      </div>

      {/* HTTP Status Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: BORDER_RADIUS.pill,
          background: config.badgeBg,
          color: config.badgeColor,
          fontSize: FONT.size.xs,
          fontWeight: FONT.weight.semibold,
          letterSpacing: '0.4px',
          marginBottom: SPACING.sm,
        }}
      >
        {config.badge}
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: compact ? FONT.size.xl : FONT.size.xxl,
          fontWeight: FONT.weight.medium,
          color: COLORS.text.primary,
          margin: `0 0 ${SPACING.xs}`,
        }}
      >
        {displayTitle}
      </h2>

      {/* Description */}
      <p
        style={{
          fontSize: FONT.size.md,
          color: COLORS.text.secondary,
          maxWidth: '460px',
          lineHeight: 1.6,
          margin: `0 0 ${SPACING.md}`,
        }}
      >
        {displayDescription}
      </p>

      {/* Missing permission indicator */}
      {missingPermission && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: COLORS.background.secondary,
            border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT.size.xs,
            color: COLORS.text.secondary,
            fontFamily: 'monospace',
            marginBottom: SPACING.lg,
          }}
        >
          <span>Required permission:</span>
          <strong style={{ color: COLORS.status.errorDark }}>{missingPermission}</strong>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: SPACING.sm,
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        {showBack && (
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
        )}
        {showHome && (
          <Button variant="secondary" onClick={() => navigate(homePath)}>
            Go to dashboard
          </Button>
        )}
        {actions}
      </div>

      {/* Technical details accordion */}
      {details && (
        <div style={{ marginTop: SPACING.xl, maxWidth: '520px', width: '100%' }}>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: FONT.size.xs,
              color: COLORS.text.tertiary,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              margin: '0 auto',
            }}
          >
            <span style={{ fontSize: '10px' }}>{showDetails ? '▼' : '▶'}</span>
            {showDetails ? 'Hide error details' : 'Show error details'}
          </button>
          {showDetails && (
            <pre
              style={{
                marginTop: SPACING.xs,
                padding: SPACING.sm,
                background: COLORS.background.secondary,
                borderRadius: BORDER_RADIUS.md,
                fontSize: '11px',
                color: COLORS.text.secondary,
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: `1px solid ${COLORS.border.light}`,
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              {typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   SPECIALIZED CONVENIENCE PAGES
   ================================================================ */

export const ForbiddenPage = (props) => <ErrorPage status={403} {...props} />;
export const NotFoundPage = (props) => <ErrorPage status={404} {...props} />;
export const ServerErrorPage = (props) => <ErrorPage status={500} {...props} />;

export default ErrorPage;
