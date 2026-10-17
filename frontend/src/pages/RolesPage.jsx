import { useEffect, useState } from 'react';
import { Button, ConfirmationModal } from '../components/common';
import SettingsTabs from '../components/common/SettingsTabs';
import { RoleAccordionItem, RoleEditorModal } from '../components/settings/roles';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { authApi } from '../services/authApi';

export const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [expandedRole, setExpandedRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const { hasPermission } = useAuth();
  const notification = useNotification();
  const canManage = hasPermission('org:manage_roles');

  useEffect(() => {
    authApi.getRoles().then((res) => setRoles(res.data || [])).catch(() => {});
    authApi.getMembers('', 0, 1000).then((res) => setMembers(res.data?.members || [])).catch(() => {});
  }, []);

  const handleSaveRole = async (payload) => {
    try {
      if (editingRole?.id) {
        await authApi.updateRole(editingRole.id, payload);
        setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? { ...r, ...payload } : r)));
        notification.success(`Role "${payload.name || editingRole.name}" updated successfully`);
      } else {
        const res = await authApi.createRole(payload);
        setRoles((prev) => [...prev, res.data]);
        notification.success(`Role "${payload.name}" created successfully`);
      }
    } catch (e) { notification.error(e.message || 'Failed to save role'); }
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    const { id, name } = roleToDelete;
    setRoleToDelete(null);
    try {
      await authApi.deleteRole(id);
      setRoles((prev) => prev.filter((r) => r.id !== id));
      notification.success(`Role "${name}" deleted`);
    } catch (e) { notification.error(e.message || 'Failed to delete role'); }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 flex flex-col">
      <SettingsTabs
        title="Roles & permissions"
        subtitle="Define what each role can do in your organization"
        actions={canManage && <Button onClick={() => setEditingRole({})}>Create role</Button>}
      />

      <div className="w-full flex flex-col gap-3">
        {roles.map((role) => (
          <RoleAccordionItem
            key={role.id}
            role={role}
            roleMembers={members.filter((m) => m.roleId === role.id)}
            isExpanded={expandedRole === role.id}
            onToggleExpand={() => setExpandedRole((prev) => (prev === role.id ? null : role.id))}
            onEdit={setEditingRole}
            onDelete={setRoleToDelete}
            canManage={canManage}
          />
        ))}

        {roles.length === 0 && (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl text-sm font-medium">
            No roles configured yet.
          </div>
        )}
      </div>

      {editingRole !== null && (
        <RoleEditorModal role={editingRole.id ? editingRole : null} onClose={() => setEditingRole(null)} onSave={handleSaveRole} />
      )}

      <ConfirmationModal
        isOpen={!!roleToDelete}
        title="Delete Role"
        message={`Are you sure you want to delete role "${roleToDelete?.name}"? Members assigned to this role will lose their associated permissions.`}
        color="#EF4444"
        onClose={() => setRoleToDelete(null)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setRoleToDelete(null) },
          { label: 'Yes, delete', variant: 'danger', onClick: confirmDeleteRole },
        ]}
      />
    </div>
  );
};

export default RolesPage;