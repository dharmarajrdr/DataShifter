import React from 'react';
import { BarLoader, SkeletonLoader } from '../common';

export const BeetelSessionSidebar = ({
  id = 'beetel-session-sidebar',
  sessions = [],
  selectedSessionId,
  loading = false,
  onSelectSession,
}) => {
  return (
    <div
      id={id}
      className="ds-session-sidebar bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-xs"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-comments text-indigo-600 text-xs" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Conversations
          </span>
        </div>
        <span
          id={`${id}-count`}
          className="text-[11px] font-bold bg-white text-indigo-600 border border-slate-200 px-2 py-0.5 rounded-full"
        >
          {sessions.length}
        </span>
      </div>

      {loading && <BarLoader />}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <SkeletonLoader variant="table-row" count={4} height="36px" />
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            No conversations yet. Start chatting or select a prompt preset!
          </div>
        ) : (
          sessions.map((sess) => {
            const active = sess.id === selectedSessionId;
            return (
              <div
                key={sess.id}
                id={`session-item-${sess.id}`}
                onClick={() => onSelectSession(sess.id)}
                className={`p-2.5 rounded-lg cursor-pointer transition flex items-center justify-between text-xs ${
                  active
                    ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span className="truncate pr-2">{sess.title || 'New Conversation'}</span>
                {active && <i className="fa-solid fa-chevron-right text-[10px] text-indigo-500 shrink-0" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BeetelSessionSidebar;
