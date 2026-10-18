import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { authApi } from '../../../services/authApi';
import { useInviteData } from './useInviteData';

export const useMembersData = () => {
  const { user, hasPermission } = useAuth();
  const [members, setMembers] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);
  const notification = useNotification();
  const canManageMembers = hasPermission('org:manage_members');
  const canManageInvites = hasPermission('org:manage_invites');

  const fetchMembers = useCallback(async (search, page) => {
    try {
      const res = await authApi.getMembers(search, page, 9);
      const data = res.data || {};
      setMembers(data.members || []);
      setTotalMembers(data.totalMembers || 0);
      setTotalPages(data.totalPages || 0);
    } catch { /* ignore */ }
  }, []);

  const refreshMembers = useCallback(() => fetchMembers(memberSearch, memberPage), [fetchMembers, memberSearch, memberPage]);
  const inviteState = useInviteData(canManageInvites, refreshMembers);

  useEffect(() => {
    const t = setTimeout(() => { fetchMembers(memberSearch, 0); setMemberPage(0); }, 300);
    return () => clearTimeout(t);
  }, [memberSearch, fetchMembers]);

  useEffect(() => { fetchMembers(memberSearch, memberPage); }, [memberPage, fetchMembers, memberSearch]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rolesRes = await authApi.getRoles();
        setRoles((rolesRes.data || []).filter((r) => String(r.name || '').toLowerCase() !== 'agent'));
      } catch (err) { setError(err); } finally { setLoading(false); }
    })();
  }, []);

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      await authApi.updateMember(userId, { roleId: newRoleId });
      setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, roleId: newRoleId, roleName: roles.find((r) => r.id === newRoleId)?.name } : m));
      notification.success('Member role updated successfully');
    } catch (err) { notification.error(err.message || 'Failed to update member role'); }
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove || !canManageMembers) return;
    setRemovingMember(true);
    try {
      await authApi.removeMember(memberToRemove.id);
      notification.success(`Removed ${memberToRemove.fullName || memberToRemove.email} from organization`);
      setMemberToRemove(null);
      refreshMembers();
    } catch (err) { notification.error(err.message || 'Failed to remove member'); } finally { setRemovingMember(false); }
  };

  return {
    user, canManageMembers, canManageInvites, members, totalMembers, memberSearch, setMemberSearch,
    memberPage, setMemberPage, totalPages, roles, error, loading, memberToRemove,
    setMemberToRemove, removingMember, handleRoleChange, confirmRemoveMember, ...inviteState,
  };
};

export default useMembersData;
