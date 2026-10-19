import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { authApi } from '../../../../services/authApi';
import { pipelineApi } from '../../../../services/api';
import { formatRelativeTime } from './notificationHelpers';

export const useSidebarNotifications = () => {
  const { user, updateUser, refreshOrganizations } = useAuth();
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [responding, setResponding] = useState(null);

  const userId = user?.id;

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    const list = [];
    try {
      if (typeof authApi?.myInvitations === 'function') {
        const invRes = await authApi.myInvitations();
        (invRes?.data || []).forEach((inv) => {
          list.push({
            id: `inv-${inv.id}`, invId: inv.id, category: 'invitations',
            title: 'Team Invitation', desc: `Invited to join ${inv.orgName || 'organization'} as ${inv.roleName || 'Member'}.`,
            time: formatRelativeTime(inv.createdAt), isUnread: true, type: 'invite',
            meta: { tag: 'Organization', sub: inv.orgName },
          });
        });
      }
    } catch {}

    try {
      if (typeof pipelineApi?.getAll === 'function') {
        const pRes = await pipelineApi.getAll();
        (pRes?.data || []).filter((p) => p.status === 'ERRORED' || p.status === 'PAUSED').slice(0, 3).forEach((p) => {
          list.push({
            id: `pipe-${p.id}`, pipelineId: p.id, category: 'alerts',
            title: `${p.name} ${p.status === 'ERRORED' ? 'Failed' : 'Paused'}`,
            desc: p.status === 'ERRORED' ? 'Sync execution failed. Click to view logs.' : 'Pipeline replication was paused.',
            time: formatRelativeTime(p.updatedAt || p.createdAt), isUnread: true,
            type: p.status === 'ERRORED' ? 'danger' : 'warning',
            meta: { tag: 'Pipeline Alert', sub: `#${(p.id || '').slice(0, 8)}` },
            actionLink: `/pipelines/${p.id}`,
          });
        });
      }
    } catch {}

    setItems(list);
  }, [userId]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleRespond = async (invId, action) => {
    setResponding(invId);
    try {
      await authApi.handleInvitation(invId, action);
      setItems((prev) => prev.filter((i) => i.invId !== invId));
      if (action === 'ACCEPT') {
        authApi.me?.().then((r) => updateUser(r.data)).catch(() => {});
        refreshOrganizations?.();
      }
    } finally { setResponding(null); }
  };

  const handleDismiss = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const handleMarkAllRead = () => setItems((prev) => prev.map((i) => ({ ...i, isUnread: false })));

  const unreadCount = items.filter((i) => i.isUnread).length;

  return {
    items, activeTab, setActiveTab, responding, unreadCount,
    handleRespond, handleDismiss, handleMarkAllRead,
  };
};

export default useSidebarNotifications;
