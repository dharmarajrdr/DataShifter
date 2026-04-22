import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorState } from '../components/common';

/* ================================================================
   DESIGN TOKENS (self-contained — no sidebar layout dependency)
   ================================================================ */
const C = {
  bg: '#FAFAF9', bgWhite: '#FFFFFF', bgCode: '#F4F3F1', bgCodeBlock: '#1E1E2E',
  border: '#E8E8E5', borderLight: '#F0F0ED',
  text: '#1A1A1A', textSec: '#555', textTer: '#888', textMuted: '#AAA',
  brand: '#534AB7', brandLight: '#EEEDFE', brandDark: '#3C3489',
  link: '#534AB7', linkHover: '#3C3489',
  accent: '#1D9E75', accentLight: '#E1F5EE',
  codeText: '#D4D4D4', codeKeyword: '#C586C0', codeString: '#CE9178', codeComment: '#6A9955',
  tableHeader: '#F7F7F5', tableStripe: '#FCFCFB',
};

const SIDEBAR_W = 260;
const CONTENT_MAX = 780;

/* ================================================================
   MARKDOWN PARSER (lightweight, no dependencies)
   ================================================================ */
const parseMarkdown = (md) => {
  if (!md) return '';
  let html = md;

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="ds-code-block" data-lang="${lang}"><code>${escaped}</code></pre>`;
  });

  // Tables
  html = html.replace(/^\|(.+)\|\s*\n\|[\s:|-]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm, (_, header, body) => {
    const ths = header.split('|').map(h => h.trim()).filter(Boolean).map(h => `<th>${h}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const tds = row.split('|').map(c => c.trim()).filter(Boolean).map(c => `<td>${c}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table class="ds-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Blockquotes
  html = html.replace(/^>\s*\*\*(.+?)\*\*\s*(.+)$/gm, '<blockquote class="ds-callout"><strong>$1</strong> $2</blockquote>');
  html = html.replace(/^>\s(.+)$/gm, '<blockquote class="ds-blockquote">$1</blockquote>');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />');

  // Lists
  html = html.replace(/^(\d+)\.\s(.+)$/gm, '<li class="ds-ol">$2</li>');
  html = html.replace(/^[-*]\s(.+)$/gm, '<li class="ds-ul">$1</li>');
  // Wrap consecutive <li> tags
  html = html.replace(/((?:<li class="ds-ul">.+<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/((?:<li class="ds-ol">.+<\/li>\n?)+)/g, '<ol>$1</ol>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="ds-inline-code">$1</code>');

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="ds-link">$1</a>');

  // Paragraphs (lines not already wrapped in block elements)
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|ul|ol|li|pre|table|thead|tbody|tr|th|td|blockquote|hr|div)/.test(trimmed)) return line;
    return `<p>${trimmed}</p>`;
  }).join('\n');

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  return html;
};

/* ================================================================
   STYLES
   ================================================================ */
const styles = `
  .ds-docs-root { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; color: ${C.text}; }
  .ds-docs-root h1 { font-size: 28px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.5px; color: ${C.text}; }
  .ds-docs-root h2 { font-size: 20px; font-weight: 600; margin: 40px 0 12px; padding-bottom: 8px; border-bottom: 1px solid ${C.border}; color: ${C.text}; }
  .ds-docs-root h3 { font-size: 16px; font-weight: 600; margin: 28px 0 8px; color: ${C.text}; }
  .ds-docs-root h4 { font-size: 14px; font-weight: 600; margin: 20px 0 6px; color: ${C.textSec}; }
  .ds-docs-root p { font-size: 14.5px; line-height: 1.75; margin: 0 0 12px; color: ${C.textSec}; }
  .ds-docs-root strong { color: ${C.text}; font-weight: 600; }
  .ds-docs-root em { font-style: italic; }
  .ds-docs-root hr { border: none; border-top: 1px solid ${C.border}; margin: 32px 0; }
  .ds-docs-root ul, .ds-docs-root ol { padding-left: 24px; margin: 0 0 16px; }
  .ds-docs-root li { font-size: 14.5px; line-height: 1.75; color: ${C.textSec}; margin-bottom: 4px; }
  .ds-docs-root a.ds-link { color: ${C.link}; text-decoration: none; font-weight: 500; }
  .ds-docs-root a.ds-link:hover { color: ${C.linkHover}; text-decoration: underline; }
  .ds-docs-root code.ds-inline-code {
    background: ${C.bgCode}; padding: 2px 7px; border-radius: 5px; font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12.5px; color: #B8336A; font-weight: 500;
  }
  .ds-docs-root pre.ds-code-block {
    background: ${C.bgCodeBlock}; padding: 18px 20px; border-radius: 10px; overflow-x: auto; margin: 0 0 20px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .ds-docs-root pre.ds-code-block code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12.5px; line-height: 1.7;
    color: ${C.codeText}; background: none; padding: 0;
  }
  .ds-docs-root table.ds-table {
    width: 100%; border-collapse: collapse; margin: 0 0 20px; font-size: 13.5px; border-radius: 8px; overflow: hidden;
    border: 1px solid ${C.border};
  }
  .ds-docs-root table.ds-table th {
    text-align: left; padding: 10px 14px; background: ${C.tableHeader}; font-weight: 600; color: ${C.text};
    border-bottom: 1px solid ${C.border}; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.3px;
  }
  .ds-docs-root table.ds-table td {
    padding: 9px 14px; border-bottom: 1px solid ${C.borderLight}; color: ${C.textSec};
  }
  .ds-docs-root table.ds-table tr:last-child td { border-bottom: none; }
  .ds-docs-root table.ds-table tr:nth-child(even) { background: ${C.tableStripe}; }
  .ds-docs-root blockquote.ds-blockquote {
    border-left: 3px solid ${C.brand}; padding: 12px 16px; margin: 0 0 16px; background: ${C.brandLight};
    border-radius: 0 8px 8px 0; font-size: 13.5px; color: ${C.brandDark};
  }
  .ds-docs-root blockquote.ds-callout {
    border-left: 3px solid ${C.accent}; padding: 12px 16px; margin: 0 0 16px; background: ${C.accentLight};
    border-radius: 0 8px 8px 0; font-size: 13.5px; color: #085041;
  }
`;

/* ================================================================
   SIDEBAR NAV ITEM
   ================================================================ */
const NavItem = ({ item, active, onClick }) => (
  <div onClick={() => onClick(item.path)}
    style={{
      padding: '6px 12px 6px 20px', cursor: 'pointer', fontSize: '13px', borderRadius: '6px',
      color: active ? C.brand : C.textSec, fontWeight: active ? 600 : 400,
      background: active ? C.brandLight : 'transparent',
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F0F0ED'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
    {item.title}
  </div>
);

const NavSection = ({ section, activePath, onSelect }) => {
  const hasActive = section.items.some(i => i.path === activePath);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        padding: '4px 12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.8px', color: hasActive ? C.brand : C.textMuted, marginBottom: '4px',
      }}>{section.title}</div>
      {section.items.map(item => (
        <NavItem key={item.path} item={item} active={activePath === item.path} onClick={onSelect} />
      ))}
    </div>
  );
};

/* ================================================================
   DOCS PAGE
   ================================================================ */
const DocsPage = () => {
  const [manifest, setManifest] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activePath = searchParams.get('page') || 'getting-started/introduction.md';

  // Load manifest
  useEffect(() => {
    fetch('/docs/manifest.json').then(r => r.json()).then(setManifest).catch(() => {});
  }, []);

  // Load markdown content
  const loadDoc = useCallback((path) => {
    setLoading(true);
    setNotFound(false);
    fetch(`/docs/${path}`).then(r => {
      if (!r.ok) throw new Error('Not found');
      const contentType = r.headers.get('content-type') || '';
      if (contentType.includes('text/html')) throw new Error('Not a markdown file');
      return r.text();
    }).then(md => {
      // Double-check: if dev server returned index.html as fallback
      if (md.trim().startsWith('<!DOCTYPE') || md.trim().startsWith('<html')) {
        throw new Error('Not a markdown file');
      }
      setContent(md);
      setLoading(false);
    }).catch(() => {
      setContent('');
      setNotFound(true);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadDoc(activePath); }, [activePath, loadDoc]);

  const handleSelect = (path) => {
    setSearchParams({ page: path });
    window.scrollTo(0, 0);
  };

  const renderedHtml = useMemo(() => parseMarkdown(content), [content]);

  // Find current doc title for breadcrumb
  const currentTitle = useMemo(() => {
    for (const section of manifest) {
      const item = section.items.find(i => i.path === activePath);
      if (item) return { section: section.title, title: item.title };
    }
    return { section: '', title: '' };
  }, [manifest, activePath]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style>{styles}</style>

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 52, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span onClick={() => navigate('/pipelines')}
            style={{ fontSize: '15px', fontWeight: 600, color: C.brand, cursor: 'pointer', letterSpacing: '-0.3px' }}>
            DataShifter
          </span>
          <span style={{ color: C.borderLight, fontSize: '18px' }}>/</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: C.text }}>Documentation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Copy link */}
          <button onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
            title="Copy link to this page"
            style={{
              padding: '6px 12px', borderRadius: '6px', border: `1px solid ${C.border}`,
              background: C.bgWhite, fontSize: '12px', fontWeight: 500, color: C.textSec, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8 1.5H3.5A1.5 1.5 0 002 3v7a1.5 1.5 0 001.5 1.5h5A1.5 1.5 0 0010 10V3.5L8 1.5z" stroke={C.textSec} strokeWidth="1.1" strokeLinejoin="round"/>
              <path d="M4.5 11.5v.5a1 1 0 001 1h4a1 1 0 001-1V5l-2-2" stroke={C.textSec} strokeWidth="1.1" strokeLinejoin="round"/>
            </svg>
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          {/* Print */}
          <button onClick={() => window.print()}
            title="Print this page"
            style={{
              padding: '6px', borderRadius: '6px', border: `1px solid ${C.border}`,
              background: C.bgWhite, cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 10H2.5A1.5 1.5 0 011 8.5v-3A1.5 1.5 0 012.5 4H4M12 4h1.5A1.5 1.5 0 0115 5.5v3a1.5 1.5 0 01-1.5 1.5H12" stroke={C.textSec} strokeWidth="1.1"/>
              <rect x="4" y="1" width="8" height="4" rx="0.5" stroke={C.textSec} strokeWidth="1.1"/>
              <rect x="4" y="9" width="8" height="5.5" rx="0.5" stroke={C.textSec} strokeWidth="1.1"/>
              <path d="M6 11.5h4M6 13h2.5" stroke={C.textSec} strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'flex', paddingTop: 52 }}>

        {/* Sidebar */}
        <div style={{
          width: SIDEBAR_W, flexShrink: 0, position: 'fixed', top: 52, bottom: 0, left: 0,
          overflowY: 'auto', borderRight: `1px solid ${C.border}`, background: C.bgWhite,
          padding: '20px 12px',
        }}>
          {manifest.map(section => (
            <NavSection key={section.title} section={section} activePath={activePath} onSelect={handleSelect} />
          ))}
        </div>

        {/* Content */}
        <div style={{ marginLeft: SIDEBAR_W, flex: 1, minHeight: 'calc(100vh - 52px)' }}>
          <div style={{ maxWidth: CONTENT_MAX, margin: '0 auto', padding: '40px 48px 80px' }}>

            {/* Breadcrumb */}
            {currentTitle.section && (
              <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', fontWeight: 500 }}>
                {currentTitle.section}
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                Loading...
              </div>
            ) : notFound ? (
              <ErrorState
                type="not-found"
                title="Page not found"
                description={`The documentation page could not be found. Please select an available page from the sidebar.`}
                showHome={false}
                showBack={false}
                onRetry={() => handleSelect('getting-started/introduction.md')}
              />
            ) : (
              <div className="ds-docs-root" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;