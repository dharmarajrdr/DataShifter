import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRSC, FRBC } from '../../constants/layouts';
import { AGENT } from '../../constants/literals';
import { BeetelIcon, CloseIcon } from '../layout/Icons';
import BeetelChatWorkspace from './BeetelChatWorkspace';

const BeetelSplitPanel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);

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

      {/* Split-Screen Panel */}
      {isOpen && (
        <div style={{
          width: '400px',
          minWidth: '380px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          right: 0,
          borderLeft: `1px solid ${COLORS.border.light}`,
          background: COLORS.background.primary,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 95,
          boxShadow: '-4px 0 18px rgba(0, 0, 0, 0.05)',
        }}>
          {/* Panel Header */}
          <div style={{
            ...FRBC,
            padding: `${SPACING.sm} ${SPACING.md}`,
            background: 'linear-gradient(135deg, #261F5E 0%, #4A3FB0 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#FFFFFF',
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
                title="Close split panel"
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

          {/* Chat Workspace inside Split Panel */}
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
      )}
    </>
  );
};

export default BeetelSplitPanel;
