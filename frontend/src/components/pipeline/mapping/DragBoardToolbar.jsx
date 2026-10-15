import React from 'react';

const bS = {
  background: 'none',
  border: '1px solid #E8E8E5',
  borderRadius: '4px',
  width: 26,
  height: 26,
  cursor: 'pointer',
  fontSize: '14px',
  color: '#6B6B6B',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const OrganizeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="1" width="4" height="3" rx=".8" stroke="currentColor" strokeWidth="1.2" />
    <rect x="1" y="6" width="4" height="3" rx=".8" stroke="currentColor" strokeWidth="1.2" />
    <rect x="9" y="3.5" width="4" height="3" rx=".8" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 2.5h3M5 7.5h2.5M8.5 5H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 2.5v3.5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.8 6C3.4 3.8 5.3 2.2 7.5 2.2c2.8 0 5 2.2 5 5s-2.2 5-5 5c-1.8 0-3.3-.9-4.2-2.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/**
 * DragBoard canvas controls toolbar (<= 100 lines).
 */
export const DragBoardToolbar = ({
  id = 'drag-board-toolbar',
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onOrganize,
}) => (
  <>
    <div
      id={`${id}-hint`}
      className="absolute top-2 left-2 z-10 text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 shadow-xs"
    >
      Alt+drag pan · Ctrl+scroll zoom · Drag headers to move
    </div>

    <div
      id={id}
      className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-xs"
    >
      <button id={`${id}-zoom-in`} onClick={onZoomIn} style={bS} title="Zoom in">+</button>
      <span id={`${id}-zoom-level`} className="text-[10px] text-slate-500 min-w-9 text-center font-mono">
        {Math.round(zoom * 100)}%
      </span>
      <button id={`${id}-zoom-out`} onClick={onZoomOut} style={bS} title="Zoom out">-</button>
      <span className="text-slate-300 px-0.5">|</span>
      <button id={`${id}-reset`} onClick={onResetView} style={bS} title="Reset view">
        <ResetIcon />
      </button>
      <button id={`${id}-organize`} onClick={onOrganize} style={{ ...bS, color: '#534AB7' }} title="Organize">
        <OrganizeIcon />
      </button>
    </div>
  </>
);

export default DragBoardToolbar;
