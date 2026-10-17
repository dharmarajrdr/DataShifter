import React from 'react';
import { COLORS, FONT, BORDER_RADIUS } from '../../constants/design';

/**
 * Parses inline markdown tokens:
 * - `inline code`
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - ~~strikethrough~~
 * - [link text](url)
 */
export const renderInline = (text, isUserBubble = false) => {
  if (!text) return null;

  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;
  const parts = String(text).split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          style={{
            fontFamily: FONT.mono || 'ui-monospace, monospace',
            fontSize: '0.88em',
            padding: '1px 5px',
            borderRadius: BORDER_RADIUS.sm,
            background: isUserBubble ? 'rgba(255,255,255,0.2)' : '#F1EFE8',
            color: isUserBubble ? '#fff' : COLORS.accent?.purpleText || '#533AB7',
            border: isUserBubble ? 'none' : `1px solid ${COLORS.border.light}`,
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong
          key={idx}
          className={`font-bold ${isUserBubble ? 'text-indigo-950 font-bold' : 'text-slate-900 font-bold'}`}
          style={{ fontWeight: 700 }}
        >
          {renderInline(part.slice(2, -2), isUserBubble)}
        </strong>
      );
    }

    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return <del key={idx}>{renderInline(part.slice(2, -2), isUserBubble)}</del>;
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: isUserBubble ? '#fff' : COLORS.brand.primary,
            textDecoration: 'underline',
            fontWeight: FONT.weight.medium,
          }}
        >
          {linkMatch[1]}
        </a>
      );
    }

    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return <em key={idx}>{renderInline(part.slice(1, -1), isUserBubble)}</em>;
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

