import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { authApi } from '../../../services/authApi';
import Tooltip from '../../common/Tooltip';

export const SidebarNotifications = ({
  id = 'sidebar-notifications',
  className = '',
  isCollapsed = false,
}) => {
  const { user, updateUser, refreshOrganizations } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [responding, setResponding] = useState(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (user) {
      authApi.myInvitations().then((r) => setInvitations(r.data || [])).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleRespond = async (invId, action) => {
    setResponding(invId);
    try {
      await authApi.handleInvitation(invId, action);
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
      if (action === 'ACCEPT') {
        authApi.me().then((r) => updateUser(r.data)).catch(() => {});
        refreshOrganizations();
      }
    } finally {
      setResponding(null);
    }
  };

  const button = (
    <button
      id="notifications-bell-btn"
      type="button"
      onClick={() => setShowNotif(!showNotif)}
      aria-label="View notifications"
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-content-secondary
        hover:text-content-primary hover:bg-surface-100 transition-colors relative
        ${isCollapsed ? 'justify-center px-0' : ''}`}
    >
      <div className="relative flex items-center">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {invitations.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-status-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {invitations.length}
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
        <div className="absolute bottom-full left-2 mb-2 w-72 bg-white border border-surface-200 rounded-xl shadow-elevated z-50 max-h-80 overflow-y-auto p-3">
          <p className="text-xs font-semibold text-content-primary mb-2">Pending Invitations</p>
          {invitations.length === 0 ? (
            <p className="text-xs text-content-tertiary text-center py-4">No new notifications</p>
          ) : (
            invitations.map((inv) => (
              <div key={inv.id} className="border-b border-surface-100 pb-2 mb-2 last:border-none last:mb-0">
                <p className="text-xs font-medium">{inv.orgName}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleRespond(inv.id, 'ACCEPT')} disabled={responding === inv.id} className="px-2.5 py-1 bg-brand text-white text-xs font-medium rounded">Accept</button>
                  <button onClick={() => handleRespond(inv.id, 'REJECT')} disabled={responding === inv.id} className="px-2.5 py-1 bg-surface-100 text-content-secondary text-xs rounded">Decline</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarNotifications;
