import React from 'react';
import { COLORS } from '../../constants/design';
import BeetelChatWorkspace from './BeetelChatWorkspace';
import BeetelDrawerHeader from './BeetelDrawerHeader';

export const BeetelDrawerPanel = ({
  isOpen,
  onClose,
  width,
  isResizing,
  onResizeStart,
  routeContext,
  sessionId,
  setSessionId,
  minWidth = 380,
}) => {
  return (
    <>
      <div
        id="beetel-drawer-backdrop"
        onClick={() => !isResizing && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.25)',
          zIndex: 1040,
          backdropFilter: 'blur(2px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />
      <div
        id="beetel-drawer-container"
        style={{
          width: `${width}px`,
          maxWidth: 'calc(100vw - 40px)',
          minWidth: `${minWidth}px`,
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
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isResizing ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          onMouseDown={onResizeStart}
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
          <div
            style={{
              width: 3,
              height: 36,
              borderRadius: 2,
              background: isResizing ? COLORS.brand.primary : COLORS.border.medium,
              opacity: isResizing ? 1 : 0.6,
              transition: 'background 0.15s, opacity 0.15s',
            }}
          />
        </div>

        <BeetelDrawerHeader routeContext={routeContext} onClose={onClose} />

        <div style={{ flex: 1, minHeight: 0 }}>
          <BeetelChatWorkspace
            sessionId={sessionId}
            onSessionCreated={(s) => setSessionId(s?.id || null)}
            initialContextType={routeContext?.type}
            initialContextEntityId={routeContext?.id}
            compact={true}
          />
        </div>
      </div>
    </>
  );
};

export default BeetelDrawerPanel;
