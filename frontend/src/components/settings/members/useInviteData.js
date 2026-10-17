import { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import { authApi } from '../../../services/authApi';

export const useInviteData = (canManageInvites, onAcceptInvite) => {
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const notification = useNotification();

  useEffect(() => {
    if (!canManageInvites) return;
    authApi.getInvitations().then((res) => setInvitations(res.data || [])).catch(() => {});
  }, [canManageInvites]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await authApi.sendInvite({ email: inviteEmail.trim(), roleId: inviteRoleId || undefined });
      notification.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteRoleId('');
      const res = await authApi.getInvitations();
      setInvitations(res.data || []);
      setTimeout(() => setInviteSuccess(null), 4000);
    } catch (err) {
      notification.error(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleInvitationAction = async (id, action) => {
    try {
      await authApi.handleInvitation(id, action);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      notification.success(`Invitation ${action === 'ACCEPT' ? 'approved' : 'rejected'}`);
      if (action === 'ACCEPT' && onAcceptInvite) onAcceptInvite();
    } catch (err) {
      notification.error(err.message || 'Failed to process invitation');
    }
  };

  return {
    invitations, inviteEmail, setInviteEmail, inviteRoleId, setInviteRoleId,
    inviting, inviteSuccess, handleInvite, handleInvitationAction,
  };
};

export default useInviteData;
