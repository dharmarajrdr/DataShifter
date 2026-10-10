import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, ConfirmationModal } from '../components/common';
import SettingsTabs from '../components/common/SettingsTabs';
import { CloseIcon } from '../components/layout/Icons';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../constants/design';
import { FRBC, FRSC, FRWSC } from '../constants/layouts';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { authApi } from '../services/authApi';

/* ================================================================
   PERMISSION GROUPS — organized by resource for the UI
   ================================================================ */
const PERMISSION_GROUPS = [
  {
    label: 'Pipelines', permissions: [
      { key: 'pipeline:create', label: 'Create pipelines' },
      { key: 'pipeline:view', label: 'View pipelines' },
      { key: 'pipeline:edit', label: 'Edit pipelines' },
      { key: 'pipeline:delete', label: 'Delete pipelines' },
      { key: 'pipeline:run', label: 'Run pipelines' },
      { key: 'pipeline:pause', label: 'Pause pipelines' },
      { key: 'pipeline:stop', label: 'Stop pipelines' },
    ],
  },
  {
    label: 'Namespaces', permissions: [
      { key: 'namespace:create', label: 'Create namespaces' },
      { key: 'namespace:edit', label: 'Edit namespaces' },
      { key: 'namespace:delete', label: 'Delete namespaces' },
    ],
  },
  {
    label: 'Connections', permissions: [
      { key: 'connection:view', label: 'View connections' },
      { key: 'connection:create', label: 'Create connections' },
      { key: 'connection:edit', label: 'Edit connections' },
      { key: 'connection:delete', label: 'Delete connections' },
      { key: 'connection:test', label: 'Test connections' },
      { key: 'connection:browse_schema', label: 'Browse schema' },
    ],
  },
  {
    label: 'Monitoring', permissions: [
      { key: 'monitor:view', label: 'View monitor' },
      { key: 'monitor:view_errors', label: 'View error logs' },
    ],
  },
  {
    label: 'User-defined functions', permissions: [
      { key: 'udf:create', label: 'Upload UDFs' },
      { key: 'udf:view', label: 'View UDFs' },
      { key: 'udf:delete', label: 'Delete UDFs' },
    ],
  },
  {
    label: 'Settings', permissions: [
      { key: 'settings:edit', label: 'Edit pipeline settings' },
    ],
  },
  {
    label: 'Organization', permissions: [
      { key: 'org:manage_members', label: 'Manage members' },
      { key: 'org:manage_roles', label: 'Manage roles' },
      { key: 'org:manage_invites', label: 'Manage invitations' },
      { key: 'org:view_audit', label: 'View audit log' },
    ],
  },
];

/* ================================================================
   ROLE EDITOR MODAL
   ================================================================ */
const RoleEditorModal = ({ role, onClose, onSave }) => {
  const isEdit = !!role?.id;
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState(new Set(role?.permissions || []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const togglePerm = (perm) => {
    setPermissions(prev => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  };

  const toggleGroup = (group) => {
    const groupPerms = group.permissions.map(p => p.key);
    const allSelected = groupPerms.every(p => permissions.has(p));
    setPermissions(prev => {
      const next = new Set(prev);
      groupPerms.forEach(p => allSelected ? next.delete(p) : next.add(p));
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Role name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name, description, permissions: [...permissions] });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: COLORS.background.primary, borderRadius: BORDER_RADIUS.lg,
        width: '560px', maxHeight: '85vh', border: `1px solid ${COLORS.border.light}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        {/* Fixed Header */}
        <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, borderBottom: `1px solid ${COLORS.border.light}`, flexShrink: 0 }}>
          <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, margin: 0 }}>
            {isEdit ? `Edit role: ${role.name}` : 'Create new role'}
          </p>
          <span onClick={onClose} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}><CloseIcon /></span>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: SPACING.lg, overflowY: 'auto', flex: 1 }}>
          {/* Name */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Role name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box' }}
              placeholder="e.g., Moderator" disabled={role?.system} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box' }}
              placeholder="What can users with this role do?" />
          </div>

          {/* Permissions grouped */}
          <div style={{ marginBottom: SPACING.md }}>
            <div style={{ ...FRBC, marginBottom: SPACING.sm }}>
              <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary }}>Permissions ({permissions.size} selected)</label>
              <button onClick={() => setPermissions(new Set())} style={{
                background: 'none', border: 'none', fontSize: FONT.size.xs, color: COLORS.text.tertiary, cursor: 'pointer',
              }}>Clear all</button>
            </div>

            {PERMISSION_GROUPS.map(group => {
              const groupPerms = group.permissions.map(p => p.key);
              const selectedCount = groupPerms.filter(p => permissions.has(p)).length;
              const allSelected = selectedCount === groupPerms.length;

              return (
                <div key={group.label} style={{
                  border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md,
                  marginBottom: SPACING.xs, overflow: 'hidden',
                }}>
                  {/* Group header */}
                  <div style={{
                    ...FRBC, padding: `${SPACING.xs} ${SPACING.sm}`,
                    background: COLORS.background.secondary, cursor: 'pointer',
                  }} onClick={() => toggleGroup(group)}>
                    <div style={{ ...FRSC, gap: SPACING.xs }}>
                      <input type="checkbox" checked={allSelected} readOnly
                        style={{ accentColor: COLORS.brand.primary, cursor: 'pointer' }} />
                      <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium }}>{group.label}</span>
                    </div>
                    <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                      {selectedCount}/{groupPerms.length}
                    </span>
                  </div>
                  {/* Individual permissions */}
                  <div style={{ padding: `${SPACING.xxs} ${SPACING.sm} ${SPACING.xs}` }}>
                    {group.permissions.map(perm => (
                      <div key={perm.key} style={{
                        ...FRSC, gap: SPACING.xs, padding: '3px 0', cursor: 'pointer',
                      }} onClick={() => togglePerm(perm.key)}>
                        <input type="checkbox" checked={permissions.has(perm.key)} readOnly
                          style={{ accentColor: COLORS.brand.primary, cursor: 'pointer' }} />
                        <span style={{ fontSize: FONT.size.xs, color: COLORS.text.primary }}>{perm.label}</span>
                        <span style={{ fontSize: '10px', color: COLORS.text.tertiary, fontFamily: 'monospace' }}>{perm.key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{ background: COLORS.status.errorLight, color: COLORS.status.errorText, padding: '8px 12px', borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, marginBottom: SPACING.sm }}>
              {error}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, borderTop: `1px solid ${COLORS.border.light}`, background: COLORS.background.primary, flexShrink: 0 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} style={saving ? { opacity: 0.6 } : {}}>
            {saving ? 'Saving...' : (isEdit ? 'Update role' : 'Create role')}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   MAIN — ROLES PAGE
   ================================================================ */
const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [editingRole, setEditingRole] = useState(null);   // null | {} (new) | role obj (edit)
  const [expandedRole, setExpandedRole] = useState(null);
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const canManage = hasPermission('org:manage_roles');

  const [roleToDelete, setRoleToDelete] = useState(null);
  const notification = useNotification();

  useEffect(() => {
    authApi.getRoles().then(res => setRoles(res.data || []));
    authApi.getMembers('', 0, 1000).then(res => setMembers(res.data?.members || []));
  }, []);

  const handleCreateRole = async (payload) => {
    try {
      const res = await authApi.createRole(payload);
      setRoles(prev => [...prev, res.data]);
      notification.success(`Role "${payload.name}" created successfully`);
    } catch (e) {
      notification.error(e.message || 'Failed to create role');
    }
  };

  const handleUpdateRole = async (payload) => {
    try {
      await authApi.updateRole(editingRole.id, payload);
      setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, ...payload } : r));
      notification.success(`Role "${payload.name || editingRole.name}" updated successfully`);
    } catch (e) {
      notification.error(e.message || 'Failed to update role');
    }
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    const roleId = roleToDelete.id;
    const roleName = roleToDelete.name;
    setRoleToDelete(null);
    try {
      await authApi.deleteRole(roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
      notification.success(`Role "${roleName}" deleted`);
    } catch (e) {
      notification.error(e.message || 'Failed to delete role');
    }
  };

  const getMembersForRole = (roleId) => members.filter(m => m.roleId === roleId);

  return (
    <div>
      <SettingsTabs
        title="Roles & permissions"
        subtitle="Define what each role can do in your organization"
        actions={canManage && <Button onClick={() => setEditingRole({})}>Create role</Button>}
      />

      <div style={{ maxWidth: '680px', paddingTop: SPACING.xl }}>
        {roles.map(role => {
          const roleMembers = getMembersForRole(role.id);
          const isExpanded = expandedRole === role.id;

          return (
            <div key={role.id} style={{
              border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.lg,
              marginBottom: SPACING.sm, overflow: 'hidden', background: COLORS.background.primary,
            }}>
              {/* Role header */}
              <div style={{
                ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, cursor: 'pointer',
              }} onClick={() => setExpandedRole(isExpanded ? null : role.id)}>
                <div style={{ ...FRSC, gap: SPACING.sm }}>
                  <span style={{ fontSize: '11px', color: COLORS.text.tertiary, width: '14px' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <div>
                    <div style={{ ...FRSC, gap: SPACING.xs }}>
                      <p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, margin: 0 }}>{role.name}</p>
                      {role.system && <Chip label="System" colorScheme="default" style={{ fontSize: '9px' }} />}
                    </div>
                    <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0, marginTop: '2px' }}>
                      {role.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div style={{ ...FRSC, gap: SPACING.sm }}>
                  <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                    {roleMembers.length} member{roleMembers.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                    {role.permissions?.length || 0} permissions
                  </span>
                </div>
              </div>

              {/* Expanded: permissions + members + actions */}
              {isExpanded && (
                <div style={{ padding: `0 ${SPACING.lg} ${SPACING.lg}`, borderTop: `1px solid ${COLORS.border.light}` }}>
                  {/* Permissions chips */}
                  <div style={{ marginTop: SPACING.md, marginBottom: SPACING.md }}>
                    <p style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: COLORS.text.secondary, marginBottom: SPACING.xs }}>Permissions</p>
                    <div style={{ ...FRWSC, gap: '4px' }}>
                      {role.permissions && role.permissions.length > 0 ? role.permissions.map(p => (
                        <span key={p} style={{
                          fontSize: '10px', fontFamily: 'monospace', padding: '2px 8px',
                          background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.pill,
                          color: COLORS.text.secondary,
                        }}>{p}</span>
                      )) : (
                        <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>No permissions assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Members with this role */}
                  {roleMembers.length > 0 && (
                    <div style={{ marginBottom: SPACING.md }}>
                      <p style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: COLORS.text.secondary, marginBottom: SPACING.xs }}>Members</p>
                      <div style={{ ...FRSC, gap: '6px', flexWrap: 'wrap' }}>
                        {roleMembers.map(m => (
                          <div key={m.id} style={{
                            ...FRSC, gap: '6px', padding: '4px 10px 4px 4px',
                            background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.pill,
                          }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', background: m.avatarColor || COLORS.brand.primary,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '9px', fontWeight: 500, color: '#fff',
                            }}>{m.displayInitials}</div>
                            <span style={{ fontSize: FONT.size.xs }}>{m.fullName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {canManage && (
                    <div style={{ ...FRSC, gap: SPACING.xs }}>
                      <Button variant="secondary" size="sm" onClick={() => setEditingRole(role)}>Edit permissions</Button>
                      {!role.system && (
                        <Button variant="danger" size="sm" onClick={() => setRoleToDelete(role)}>Delete role</Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {roles.length === 0 && (
          <div style={{
            padding: '40px', textAlign: 'center', color: COLORS.text.tertiary,
            border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.lg,
          }}>
            No roles configured yet.
          </div>
        )}
      </div>

      {/* Role editor modal */}
      {editingRole !== null && (
        <RoleEditorModal
          role={editingRole.id ? editingRole : null}
          onClose={() => setEditingRole(null)}
          onSave={editingRole.id ? handleUpdateRole : handleCreateRole}
        />
      )}

      {/* Delete role confirmation modal */}
      <ConfirmationModal
        isOpen={!!roleToDelete}
        title="Delete Role"
        message={`Are you sure you want to delete role "${roleToDelete?.name}"? Members assigned to this role will lose their associated permissions.`}
        color={COLORS.status.error}
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