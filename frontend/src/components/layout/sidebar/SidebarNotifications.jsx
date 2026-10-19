import React, { useState, useEffect, useRef } from 'react';
import Tooltip from '../../common/Tooltip';
import useSidebarNotifications from './notifications/useSidebarNotifications';
import NotificationPopover from './notifications/NotificationPopover';

export const SidebarNotifications = ({
  id = 'sidebar-notifications',
  className = '',
  isCollapsed = false,
}) => {
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  const {
    items, activeTab, setActiveTab, responding, unreadCount,
    handleRespond, handleDismiss, handleMarkAllRead,
  } = useSidebarNotifications();

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const button = (
    <button
      id="notifications-bell-btn"
      type="button"
      onClick={() => setShowNotif(!showNotif)}
      aria-label="View notifications"
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative
        ${showNotif ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-content-secondary hover:text-content-primary hover:bg-surface-100'}
        ${isCollapsed ? 'justify-center px-0' : ''}`}
    >
      <div className="relative flex items-center">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </div>
      {!isCollapsed && <span>Notifications</span>}
    </button>
  );

  return (
    <div id={id} ref={notifRef} className={`relative px-2 mb-1.5 ${className}`}>
      {isCollapsed ? <Tooltip text="Notifications" position="right">{button}</Tooltip> : button}
      {showNotif && (
        <NotificationPopover
          items={items} activeTab={activeTab} onSelectTab={setActiveTab}
          unreadCount={unreadCount} onMarkAllRead={handleMarkAllRead}
          onRespond={handleRespond} onDismiss={handleDismiss}
          responding={responding} onClose={() => setShowNotif(false)}
          isCollapsed={isCollapsed}
        />
      )}
    </div>
  );
};

export default SidebarNotifications;
