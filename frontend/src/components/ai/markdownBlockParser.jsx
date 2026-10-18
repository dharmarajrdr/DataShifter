import React from 'react';
import { COLORS } from '../../constants/design';
import {
  renderHeading,
  renderBlockquote,
  renderList,
  renderParagraph,
  isTableRow,
  isTableDivider,
  isBlockBoundary,
  MarkdownTable,
} from './markdownBlocks';
import { parseTableBlock } from './markdownTable';

const collectBlockquote = (lines, start) => {
  const quoteLines = [];
  let i = start;
  while (i < lines.length && lines[i].trim().startsWith('>')) {
    quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
    i++;
  }
  return { quoteLines, nextIdx: i };
};

const collectList = (lines, start, regex) => {
  const items = [];
  let i = start;
  while (i < lines.length && regex.test(lines[i].trim())) {
    items.push(lines[i].trim().replace(regex, ''));
    i++;
  }
  return { items, nextIdx: i };
};

export const parseBlocks = (blockText, segIdx, isUser) => {
  const lines = blockText.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      const hrBorder = isUser ? 'rgba(255,255,255,0.25)' : COLORS.border.light;
      elements.push(<hr key={`${segIdx}-hr-${i}`} style={{ border: 'none', borderTop: `1px solid ${hrBorder}`, margin: '8px 0' }} />);
      i++;
      continue;
    }
    const hMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      elements.push(renderHeading(segIdx, i, hMatch[1].length, hMatch[2], isUser, elements.length));
      i++;
      continue;
    }
    if (isTableRow(trimmed) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const { headers, rows, nextIdx } = parseTableBlock(lines, i);
      elements.push(<MarkdownTable key={`${segIdx}-tbl-${i}`} headers={headers} rows={rows} isUser={isUser} />);
      i = nextIdx;
      continue;
    }
    if (trimmed.startsWith('>')) {
      const { quoteLines, nextIdx } = collectBlockquote(lines, i);
      elements.push(renderBlockquote(segIdx, i, quoteLines, isUser));
      i = nextIdx;
      continue;
    }
    if (/^[-*•]\s+/.test(trimmed)) {
      const { items, nextIdx } = collectList(lines, i, /^[-*•]\s+/);
      elements.push(renderList(segIdx, i, items, false, isUser));
      i = nextIdx;
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const { items, nextIdx } = collectList(lines, i, /^\d+\.\s+/);
      elements.push(renderList(segIdx, i, items, true, isUser));
      i = nextIdx;
      continue;
    }

    const paraLines = [];
    while (i < lines.length && !isBlockBoundary(lines[i].trim(), lines[i + 1] || '')) {
      paraLines.push(lines[i]);
      i++;
    }
    elements.push(renderParagraph(segIdx, i, paraLines, isUser, elements.length === 0));
  }
  return elements;
};

