import React, { useState } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';

export const CodeBlock = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      style={{
        margin: `${SPACING.xs} 0`,
        borderRadius: BORDER_RADIUS.md,
        border: `1px solid ${COLORS.border.light}`,
        background: '#1E1E24',
        color: '#F4F4F6',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 10px',
          background: '#2A2A32',
          borderBottom: '1px solid #3A3A44',
          fontSize: '11px',
          color: '#B8B8C4',
        }}
      >
        <span style={{ fontFamily: 'monospace', textTransform: 'lowercase' }}>{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#D8D8E2',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '1px 4px',
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '10px 12px',
          overflowX: 'auto',
          fontSize: '12px',
          lineHeight: 1.5,
          fontFamily: FONT.mono || 'ui-monospace, monospace',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

