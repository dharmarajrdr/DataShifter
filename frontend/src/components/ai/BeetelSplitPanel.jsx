import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import BeetelDockedButton from './BeetelDockedButton';
import BeetelDrawerPanel from './BeetelDrawerPanel';

const MIN_OVERLAY_WIDTH = 380;
const MAX_OVERLAY_WIDTH = 920;
const DEFAULT_OVERLAY_WIDTH = 480;

export const BeetelSplitPanel = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('beetel_overlay_width');
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_OVERLAY_WIDTH;
    return isNaN(parsed) ? DEFAULT_OVERLAY_WIDTH : Math.min(Math.max(parsed, MIN_OVERLAY_WIDTH), MAX_OVERLAY_WIDTH);
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(Math.max(newWidth, MIN_OVERLAY_WIDTH), Math.min(MAX_OVERLAY_WIDTH, window.innerWidth - 80));
      setWidth(clamped);
    };
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        setWidth((w) => {
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

  const routeContext = useMemo(() => {
    const p = location.pathname;
    const pipe = p.match(/^\/pipelines\/([^/]+)/);
    if (pipe && pipe[1] !== 'new') return { type: 'PIPELINE', id: pipe[1] };
    const wf = p.match(/^\/workflows\/([^/]+)/);
    if (wf && wf[1] !== 'new') return { type: 'WORKFLOW', id: wf[1] };
    if (p.startsWith('/workflows')) return { type: 'WORKFLOW', id: '' };
    if (p.startsWith('/pipelines')) return { type: 'PIPELINE', id: '' };
    return { type: 'NONE', id: '' };
  }, [location.pathname]);

  if (location.pathname.startsWith('/beetel')) return null;

  return (
    <>
      {!isOpen && <BeetelDockedButton onOpen={() => setIsOpen(true)} />}
      <BeetelDrawerPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        width={width}
        isResizing={isResizing}
        onResizeStart={handleMouseDown}
        routeContext={routeContext}
        sessionId={sessionId}
        setSessionId={setSessionId}
        minWidth={MIN_OVERLAY_WIDTH}
      />
    </>
  );
};

export default BeetelSplitPanel;
