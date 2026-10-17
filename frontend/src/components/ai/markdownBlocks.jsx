import React from 'react';
import { COLORS, FONT, BORDER_RADIUS } from '../../constants/design';
import { renderInline } from './markdownInline';
import { isTableRow, isTableDivider, parseTableCells, MarkdownTable } from './markdownTable';

const FONT_SIZES = { 1: FONT.size.lg, 2: FONT.size.base, 3: FONT.size.sm, 4: FONT.size.xs };

export const renderHeading = (segIdx, i, level, text, isUser, elementsLen) => (
  <div
    key={`${segIdx}-h-${i}`}
    style={{
      fontSize: FONT_SIZES[level] || FONT.size.sm,
      fontWeight: FONT.weight.semibold,
      margin: elementsLen === 0 ? '0 0 6px 0' : '10px 0 4px 0',
      lineHeight: 1.35,
    }}
  >
    {renderInline(text, isUser)}
  </div>
);

export const renderBlockquote = (segIdx, i, quoteLines, isUser) => (
  <blockquote
    key={`${segIdx}-bq-${i}`}
    style={{
      margin: '6px 0',
      padding: '4px 10px',
      borderLeft: `3px solid ${isUser ? 'rgba(255,255,255,0.6)' : COLORS.brand.primary}`,
      background: isUser ? 'rgba(255,255,255,0.08)' : '#fff',
      borderRadius: `0 ${BORDER_RADIUS.sm} ${BORDER_RADIUS.sm} 0`,
      color: isUser ? '#fff' : COLORS.text.secondary,
    }}
  >
    {quoteLines.map((ql, qIdx) => (
      <div key={qIdx}>{renderInline(ql, isUser)}</div>
    ))}
  </blockquote>
);

export const renderList = (segIdx, i, items, isOrdered, isUser) => {
  const Comp = isOrdered ? 'ol' : 'ul';
  return (
    <Comp
      key={`${segIdx}-${isOrdered ? 'ol' : 'ul'}-${i}`}
      className={`${isOrdered ? 'list-decimal' : 'list-disc'} pl-5 my-2 space-y-1 text-xs`}
      style={{ listStyleType: isOrdered ? 'decimal' : 'disc' }}
    >
      {items.map((item, idx) => (
        <li key={idx} className="leading-relaxed pl-1" style={{ display: 'list-item' }}>
          {renderInline(item, isUser)}
        </li>
      ))}
    </Comp>
  );
};

export const renderParagraph = (segIdx, i, paraLines, isUser, isFirst) => (
  <p key={`${segIdx}-p-${i}`} style={{ margin: isFirst ? '0' : '6px 0 0 0', lineHeight: 1.55 }}>
    {paraLines.map((pl, pIdx) => (
      <React.Fragment key={pIdx}>
        {renderInline(pl, isUser)}
        {pIdx < paraLines.length - 1 && <br />}
      </React.Fragment>
    ))}
  </p>
);

export const isBlockBoundary = (trimmed, nextLine = '') =>
  !trimmed ||
  /^(#{1,4})\s+/.test(trimmed) ||
  /^([-*_])\1{2,}$/.test(trimmed) ||
  /^[-*•]\s+/.test(trimmed) ||
  /^\d+\.\s+/.test(trimmed) ||
  trimmed.startsWith('>') ||
  (isTableRow(trimmed) && isTableDivider(nextLine.trim()));

export { isTableRow, isTableDivider, parseTableCells, MarkdownTable };

