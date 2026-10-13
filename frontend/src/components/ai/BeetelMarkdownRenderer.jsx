import React, { useState } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';

/**
 * Parses inline markdown tokens:
 * - `inline code`
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - ~~strikethrough~~
 * - [link text](url)
 */
const renderInline = (text, isUserBubble = false) => {
  if (!text) return null;

  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;
  const parts = String(text).split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeText = part.slice(1, -1);
      return (
        <code
          key={idx}
          style={{
            fontFamily: FONT.mono || 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.88em',
            padding: '1px 5px',
            borderRadius: BORDER_RADIUS.sm,
            background: isUserBubble ? 'rgba(255,255,255,0.2)' : '#F1EFE8',
            color: isUserBubble ? '#fff' : COLORS.accent?.purpleText || '#533AB7',
            border: isUserBubble ? 'none' : `1px solid ${COLORS.border.light}`,
          }}
        >
          {codeText}
        </code>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={idx} style={{ fontWeight: FONT.weight.semibold }}>
          {renderInline(part.slice(2, -2), isUserBubble)}
        </strong>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return <del key={idx}>{renderInline(part.slice(2, -2), isUserBubble)}</del>;
    }

    // Link: [label](url)
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

    // Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return <em key={idx}>{renderInline(part.slice(1, -1), isUserBubble)}</em>;
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

const CodeBlock = ({ lang, code }) => {
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
          fontFamily: FONT.mono || 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

const isTableRow = (line) => {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length > 2;
};

const isTableDivider = (line) => {
  const trimmed = line.trim();
  return /^\|[\s:-]+(\|[\s:-]+)+\|?$/.test(trimmed);
};

const parseTableCells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

/**
 * Renders structured GitHub-flavored Markdown inside Beetel AI chat bubbles and plan cards.
 */
const BeetelMarkdownRenderer = ({ content, isUser = false }) => {
  if (!content) return null;

  const normalized = String(content).replace(/\r\n/g, '\n');

  // Split by fenced code blocks first: ```lang\n...\n```
  const segments = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'markdown',
        text: normalized.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'codeblock',
      lang: match[1] || '',
      code: match[2].replace(/\n$/, ''),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    segments.push({
      type: 'markdown',
      text: normalized.slice(lastIndex),
    });
  }

  const renderMarkdownBlocks = (blockText, segIdx) => {
    const lines = blockText.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip blank lines
      if (!trimmed) {
        i++;
        continue;
      }

      // Horizontal Rule: ---, ***, ___
      if (/^([-*_])\1{2,}$/.test(trimmed)) {
        elements.push(
          <hr
            key={`${segIdx}-hr-${i}`}
            style={{
              border: 'none',
              borderTop: `1px solid ${isUser ? 'rgba(255,255,255,0.25)' : COLORS.border.light}`,
              margin: '8px 0',
            }}
          />
        );
        i++;
        continue;
      }

      // Headings: # to ####
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const fontSizes = {
          1: FONT.size.lg,
          2: FONT.size.base,
          3: FONT.size.sm,
          4: FONT.size.xs,
        };
        elements.push(
          <div
            key={`${segIdx}-h-${i}`}
            style={{
              fontSize: fontSizes[level] || FONT.size.sm,
              fontWeight: FONT.weight.semibold,
              margin: elements.length === 0 ? '0 0 6px 0' : '10px 0 4px 0',
              lineHeight: 1.35,
            }}
          >
            {renderInline(headingText, isUser)}
          </div>
        );
        i++;
        continue;
      }

      // Markdown Table
      if (isTableRow(trimmed) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
        const headers = parseTableCells(trimmed);
        i += 2; // Skip header and divider
        const rows = [];
        while (i < lines.length && isTableRow(lines[i])) {
          rows.push(parseTableCells(lines[i]));
          i++;
        }
        elements.push(
          <div
            key={`${segIdx}-tbl-${i}`}
            style={{
              overflowX: 'auto',
              margin: '8px 0',
              borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${COLORS.border.light}`,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: FONT.size.xs,
                background: isUser ? 'rgba(255,255,255,0.08)' : '#fff',
              }}
            >
              <thead>
                <tr style={{ background: isUser ? 'rgba(255,255,255,0.16)' : COLORS.background.secondary }}>
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px',
                        fontWeight: FONT.weight.semibold,
                        borderBottom: `1px solid ${COLORS.border.light}`,
                      }}
                    >
                      {renderInline(h, isUser)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: rIdx < rows.length - 1 ? `1px solid ${COLORS.border.light}` : 'none',
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ padding: '6px 10px', verticalAlign: 'top' }}>
                        {renderInline(cell, isUser)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Blockquote: > text
      if (trimmed.startsWith('>')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        elements.push(
          <blockquote
            key={`${segIdx}-bq-${i}`}
            style={{
              margin: '6px 0',
              padding: '4px 10px',
              borderLeft: `3px solid ${isUser ? 'rgba(255,255,255,0.6)' : COLORS.accent?.purpleText || COLORS.brand.primary}`,
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
        continue;
      }

      // Unordered List: - item or * item
      if (/^[-*•]\s+/.test(trimmed)) {
        const items = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
          i++;
        }
        elements.push(
          <ul
            key={`${segIdx}-ul-${i}`}
            style={{
              margin: '4px 0 6px 0',
              paddingLeft: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            {items.map((item, idx) => (
              <li key={idx} style={{ lineHeight: 1.5 }}>
                {renderInline(item, isUser)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered List: 1. item
      if (/^\d+\.\s+/.test(trimmed)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }
        elements.push(
          <ol
            key={`${segIdx}-ol-${i}`}
            style={{
              margin: '4px 0 6px 0',
              paddingLeft: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            {items.map((item, idx) => (
              <li key={idx} style={{ lineHeight: 1.5 }}>
                {renderInline(item, isUser)}
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Standard paragraph (collect consecutive non-special lines)
      const paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^(#{1,4})\s+/.test(lines[i].trim()) &&
        !/^([-*_])\1{2,}$/.test(lines[i].trim()) &&
        !/^[-*•]\s+/.test(lines[i].trim()) &&
        !/^\d+\.\s+/.test(lines[i].trim()) &&
        !lines[i].trim().startsWith('>') &&
        !(isTableRow(lines[i].trim()) && i + 1 < lines.length && isTableDivider(lines[i + 1]))
      ) {
        paraLines.push(lines[i]);
        i++;
      }

      elements.push(
        <p
          key={`${segIdx}-p-${i}`}
          style={{
            margin: elements.length === 0 ? '0' : '6px 0 0 0',
            lineHeight: 1.55,
          }}
        >
          {paraLines.map((pl, pIdx) => (
            <React.Fragment key={pIdx}>
              {renderInline(pl, isUser)}
              {pIdx < paraLines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    }

    return elements;
  };

  return (
    <div style={{ fontSize: FONT.size.sm, lineHeight: 1.55, wordBreak: 'break-word' }}>
      {segments.map((seg, idx) =>
        seg.type === 'codeblock' ? (
          <CodeBlock key={`cb-${idx}`} lang={seg.lang} code={seg.code} />
        ) : (
          <React.Fragment key={`md-${idx}`}>{renderMarkdownBlocks(seg.text, idx)}</React.Fragment>
        )
      )}
    </div>
  );
};

export default BeetelMarkdownRenderer;

