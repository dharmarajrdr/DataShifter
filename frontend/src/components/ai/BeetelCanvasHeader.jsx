import React from 'react';

export const BeetelCanvasHeader = ({ session, onShareClick }) => {
  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 truncate">
        <svg className="w-4 h-4 text-indigo-600 fill-indigo-600 shrink-0" viewBox="0 0 24 24">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="font-bold text-xs text-slate-800 truncate">
          Session: {session?.title || 'New Conversation'}
        </span>
        {session?.isShared && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Shared
          </span>
        )}
      </div>
      {session && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={onShareClick} className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer">
            <i className="fa-solid fa-user-plus text-[10px] text-indigo-600" />
            <span>Share</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default BeetelCanvasHeader;

