import { useState } from 'react';
import { Button } from '../../common';
import { CloseIcon } from '../../layout/Icons';
import { PERMISSION_GROUPS } from './roleConstants';
import { PermissionGroupItem } from './PermissionGroupItem';

export const RoleEditorModal = ({ role, onClose, onSave }) => {
  const isEdit = !!role?.id;
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState(new Set(role?.permissions || []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const togglePerm = (perm) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  };

  const toggleGroup = (group) => {
    const groupPerms = group.permissions.map((p) => p.key);
    const allSelected = groupPerms.every((p) => permissions.has(p));
    setPermissions((prev) => {
      const next = new Set(prev);
      groupPerms.forEach((p) => allSelected ? next.delete(p) : next.add(p));
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('Role name is required');
    setSaving(true);
    setError(null);
    try {
      await onSave({ name, description, permissions: [...permissions] });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const isAgentRole = String(role?.name || '').toLowerCase() === 'agent';
  const groups = isAgentRole ? PERMISSION_GROUPS.filter((g) => !g.permissions.some((p) => p.key.startsWith('org:'))) : PERMISSION_GROUPS;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? `Edit role: ${role.name}` : 'Create new role'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"><CloseIcon /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Role name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={role?.system} placeholder="e.g., Moderator"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What can users with this role do?"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700">Permissions ({permissions.size} selected)</label>
              <button type="button" onClick={() => setPermissions(new Set())} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Clear all</button>
            </div>
            {groups.map((group) => (
              <PermissionGroupItem key={group.label} group={group} permissions={permissions} onToggleGroup={toggleGroup} onTogglePerm={togglePerm} />
            ))}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (isEdit ? 'Update role' : 'Create role')}</Button>
        </div>
      </div>
    </div>
  );
};

export default RoleEditorModal;
