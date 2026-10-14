import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRSC, FRBC } from '../../constants/layouts';
import { AGENT } from '../../constants/literals';
import { BeetelIcon, CloseIcon } from '../layout/Icons';
import BeetelChatWorkspace from './BeetelChatWorkspace';

const MIN_OVERLAY_WIDTH = 380;
const MAX_OVERLAY_WIDTH = 920;
const DEFAULT_OVERLAY_WIDTH = 480;

const BeetelSplitPanel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Resizable overlay width state (with persistence)
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('beetel_overlay_width');
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_OVERLAY_WIDTH;
    return isNaN(parsed) ? DEFAULT_OVERLAY_WIDTH : Math.min(Math.max(parsed, MIN_OVERLAY_WIDTH), MAX_OVERLAY_WIDTH);
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  // Mouse move and mouse up listeners for resizing overlay
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      // Calculate width from the right edge of viewport
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, MIN_OVERLAY_WIDTH), Math.min(MAX_OVERLAY_WIDTH, window.innerWidth - 80));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        setWidth(w => {
          localStorage.setItem('beetel_overlay_width', String(w));
          return w;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Detect active pipeline or workflow context from URL
  const routeContext = useMemo(() => {
    const path = location.pathname;
    const pipelineMatch = path.match(/^\/pipelines\/([^/]+)/);
    if (pipelineMatch && pipelineMatch[1] !== 'new') {
      return { type: 'PIPELINE', id: pipelineMatch[1] };
    }
    const workflowMatch = path.match(/^\/workflows\/([^/]+)/);
    if (workflowMatch && workflowMatch[1] !== 'new') {
      return { type: 'WORKFLOW', id: workflowMatch[1] };
    }
    if (path.startsWith('/workflows')) {
      return { type: 'WORKFLOW', id: '' };
    }
    if (path.startsWith('/pipelines')) {
      return { type: 'PIPELINE', id: '' };
    }
    return { type: 'NONE', id: '' };
  }, [location.pathname]);

  // Hide the split-panel toggle when already on the dedicated /beetel page
  if (location.pathname.startsWith('/beetel')) {
    return null;
  }

  return (
    <>
      {/* Floating Quick-Toggle Pill when panel is closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={`Open ${AGENT.name} AI Assistant`}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 120,
            ...FRSC,
            gap: '8px',
            padding: '10px 16px',
            borderRadius: BORDER_RADIUS.full,
            border: `1px solid ${COLORS.accent.purpleText}`,
            background: COLORS.brand.primary,
            color: '#fff',
            fontSize: FONT.size.sm,
            fontWeight: FONT.weight.semibold,
            boxShadow: '0 6px 20px rgba(83, 74, 183, 0.32)',
            cursor: 'pointer',
          }}
        >
          <BeetelIcon color="#fff" size={16} />
          <span>
            {routeContext.type !== 'NONE'
              ? `Ask ${AGENT.name} (${routeContext.type === 'PIPELINE' ? 'Pipeline' : 'Workflow'})`
              : `Ask ${AGENT.name}`}
          </span>
        </button>
      )}

      {/* Overlay Backdrop & Drawer */}
      {isOpen && (
        <>
          {/* Subtle Dim Backdrop (optional click-to-close) */}
          <div
            onClick={() => !isResizing && setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.25)',
              zIndex: 1040,
              backdropFilter: 'blur(2px)',
              transition: 'opacity 0.2s ease',
            }}
          />

          {/* Resizable Overlay Panel */}
          <div style={{
            width: `${width}px`,
            maxWidth: 'calc(100vw - 40px)',
            minWidth: `${MIN_OVERLAY_WIDTH}px`,
            height: '100vh',
            position: 'fixed',
            top: 0,
            right: 0,
            background: COLORS.background.primary,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1050,
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.18)',
            userSelect: isResizing ? 'none' : 'auto',
          }}>
            {/* Left Resize Handle Bar */}
            <div
              onMouseDown={handleMouseDown}
              title="Drag to resize Beetel panel"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -5,
                width: 10,
                cursor: 'col-resize',
                zIndex: 1060,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{
                width: 3,
                height: 36,
                borderRadius: 2,
                background: isResizing ? COLORS.brand.primary : COLORS.border.medium,
                opacity: isResizing ? 1 : 0.6,
                transition: 'background 0.15s, opacity 0.15s',
              }} />
            </div>

            {/* Panel Header */}
            <div style={{
              ...FRBC,
              padding: `${SPACING.sm} ${SPACING.md}`,
              background: COLORS.brand.primary,
              borderBottom: `1px solid ${COLORS.brand.primaryDark}`,
              color: '#FFFFFF',
              flexShrink: 0,
            }}>
              <div style={{ ...FRSC, gap: SPACING.xs }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.16)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <BeetelIcon color="#FFFFFF" size={15} />
                </div>
                <div>
                  <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: '#FFFFFF', margin: 0 }}>
                    {AGENT.title}
                  </p>
                  <p style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.78)', margin: 0 }}>
                    {routeContext.type !== 'NONE'
                      ? `Bound to active ${routeContext.type.toLowerCase()}`
                      : 'Contextual AI Assistant'}
                  </p>
                </div>
              </div>

              <div style={{ ...FRSC, gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (routeContext.type !== 'NONE') {
                      params.set('contextType', routeContext.type);
                      params.set('entityId', routeContext.id);
                    }
                    navigate(`/beetel${params.toString() ? `?${params.toString()}` : ''}`);
                  }}
                  title="Expand to full Beetel workspace"
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.28)',
                    background: 'rgba(255, 255, 255, 0.14)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: FONT.weight.medium,
                    cursor: 'pointer',
                  }}
                >
                  Full view ↗
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close Beetel assistant"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="fa-solid fa-xmark" style={{ fontSize: '12px' }} />
                </button>
              </div>
            </div>

            {/* Chat Workspace inside Overlay */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <BeetelChatWorkspace
                sessionId={sessionId}
                onSessionCreated={(s) => setSessionId(s?.id || null)}
                initialContextType={routeContext.type}
                initialContextEntityId={routeContext.id}
                compact={true}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BeetelSplitPanel;
