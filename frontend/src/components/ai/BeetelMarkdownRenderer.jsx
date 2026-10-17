import React from 'react';
import { FONT } from '../../constants/design';
import { CodeBlock } from './markdownCodeBlock';
import { parseBlocks } from './markdownBlockParser';

export const splitCodeBlocks = (content) => {
  const normalized = String(content || '').replace(/\r\n/g, '\n');
  const segments = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'markdown', text: normalized.slice(lastIndex, match.index) });
    }
    segments.push({
      type: 'codeblock',
      lang: match[1] || '',
      code: match[2].replace(/\n$/, ''),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    segments.push({ type: 'markdown', text: normalized.slice(lastIndex) });
  }
  return segments;
};

/**
 * Renders structured GitHub-flavored Markdown inside Beetel AI chat bubbles and plan cards.
 */
const BeetelMarkdownRenderer = ({ content, isUser = false }) => {
  if (!content) return null;
  const segments = splitCodeBlocks(content);

  return (
    <div style={{ fontSize: FONT.size.sm, lineHeight: 1.55, wordBreak: 'break-word' }}>
      {segments.map((seg, idx) =>
        seg.type === 'codeblock' ? (
          <CodeBlock key={`cb-${idx}`} lang={seg.lang} code={seg.code} />
        ) : (
          <React.Fragment key={`md-${idx}`}>{parseBlocks(seg.text, idx, isUser)}</React.Fragment>
        )
      )}
    </div>
  );
};

export default BeetelMarkdownRenderer;
