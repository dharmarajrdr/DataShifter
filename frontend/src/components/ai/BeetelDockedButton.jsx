import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BeetelIcon } from '../layout/Icons';

export const BeetelDockedButton = ({ onOpen, title = 'Ask Beetel AI Assistant' }) => {
  const [top, setTop] = useState(() => {
    const saved = localStorage.getItem('beetel_btn_top');
    const parsed = saved ? parseInt(saved, 10) : null;
    return parsed && !isNaN(parsed)
      ? Math.min(Math.max(parsed, 60), window.innerHeight - 70)
      : Math.max(60, window.innerHeight - 110);
  });
  const dragRef = useRef({ isDragging: false, startY: 0, startTop: 0, moved: false });

  const handlePointerDown = (e) => {
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    dragRef.current = { isDragging: true, startY: clientY, startTop: top, moved: false };
  };

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.isDragging) return;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const deltaY = clientY - dragRef.current.startY;
    if (Math.abs(deltaY) > 3) dragRef.current.moved = true;
    const nextTop = Math.min(Math.max(dragRef.current.startTop + deltaY, 60), window.innerHeight - 60);
    setTop(nextTop);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current.isDragging) return;
    const { moved } = dragRef.current;
    dragRef.current.isDragging = false;
    setTop((curr) => {
      localStorage.setItem('beetel_btn_top', String(curr));
      return curr;
    });
    if (!moved && onOpen) onOpen();
  }, [onOpen]);

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <button
      id="beetel-docked-trigger-btn"
      type="button"
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      title={`${title} (Drag up/down along edge)`}
      style={{
        position: 'fixed',
        top: `${top}px`,
        right: 0,
        zIndex: 120,
        width: 44,
        height: 44,
        borderTopLeftRadius: '12px',
        borderBottomLeftRadius: '12px',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: '#4f46e5',
        boxShadow: '-3px 4px 14px rgba(79, 70, 229, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
        transition: 'background-color 0.15s ease',
      }}
      className="hover:bg-indigo-700 active:cursor-grabbing border-l border-t border-b border-indigo-400/40"
    >
      <BeetelIcon color="#ffffff" size={20} />
    </button>
  );
};

export default BeetelDockedButton;
