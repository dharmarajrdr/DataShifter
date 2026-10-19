import React from 'react';
import { Link } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import { filterNotifications, countUnreadByCategory } from './notificationHelpers';

export const NotificationPopover = ({
  items, activeTab, onSelectTab, unreadCount, onMarkAllRead,
  onRespond, onDismiss, responding, onClose, isCollapsed,
}) => {
  const filtered = filterNotifications(items, activeTab);
  const counts = countUnreadByCategory(items);

  const tabs = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'alerts', label: 'Alerts', count: counts.alerts },
    { key: 'invitations', label: 'Invitations', count: counts.invitations },
  ];

  return (
    <div className={`absolute bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 w-96 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${isCollapsed ? 'left-full bottom-0 ml-3' : 'bottom-full left-2 mb-2'}`}>
      <div className="p-3.5 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Notifications</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${unreadCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-400'}`}>
              {unreadCount} new
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onMarkAllRead} disabled={unreadCount === 0} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 px-1.5 py-0.5 rounded transition-colors">
              Mark all read
            </button>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors" title="Close">
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => onSelectTab(t.key)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${activeTab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <span>{t.label}</span>
              <span className={`text-[9px] px-1 rounded-full ${activeTab === t.key ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto p-2.5 space-y-2 bg-slate-50/50">
        {filtered.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <i className="fa-solid fa-bell text-sm" />
            </div>
            <p className="text-xs font-bold text-slate-800">You're all caught up!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No notifications in this category.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <NotificationItem key={item.id} item={item} onRespond={onRespond} onDismiss={onDismiss} responding={responding} onClose={onClose} />
          ))
        )}
      </div>

      <div className="px-3.5 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>SSE Live Sync</span>
        </div>
        <Link to="/notifyhub" onClick={onClose} className="text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 transition-colors">
          <i className="fa-solid fa-gear text-[10px]" />
          <span>Notification Settings</span>
        </Link>
      </div>
    </div>
  );
};

export default NotificationPopover;
