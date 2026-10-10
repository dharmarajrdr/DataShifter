import { useCallback, useEffect, useState } from 'react';
import { ApiGuard, Button, Chip, Loader } from '../components/common';
import SettingsTabs from '../components/common/SettingsTabs';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../constants/design';
import { FRBC, FRSC } from '../constants/layouts';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/authApi';

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md,
  fontSize: FONT.size.md,
  boxSizing: 'border-box',
};

const Avatar = ({ initials, color, size = 32 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: color || COLORS.brand.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: Math.round(size * 0.4),
      fontWeight: 500,
      color: '#fff',
    }}
  >
    {initials || '?'}
  </div>
);

const SectionTitle = ({ title, subtitle, action }) => (
  <div style={{ ...FRBC, marginBottom: SPACING.md }}>
    <div>
      <p style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.medium, margin: 0 }}>{title}</p>
      {subtitle && <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '2px', marginBottom: 0 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Divider = () => <div style={{ height: '1px', background: COLORS.border.light, margin: `${SPACING.xl} 0` }} />;

const MembersPage = () => {
  const { user, hasPermission } = useAuth();
  const [members, setMembers] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [roles, setRoles] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const canManageMembers = hasPermission('org:manage_members');
  const canManageInvites = hasPermission('org:manage_invites');

  // Fetch members with search + pagination
  const fetchMembers = useCallback(async (search, page) => {
    try {
      const res = await authApi.getMembers(search, page, 9);
      const data = res.data || {};
      setMembers(data.members || []);
      setTotalMembers(data.totalMembers || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers(memberSearch, 0);
      setMemberPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch, fetchMembers]);

  // Page change
  useEffect(() => {
    fetchMembers(memberSearch, memberPage);
  }, [memberPage, fetchMembers, memberSearch]);

  // Initial load — roles + invitations
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rolesRes = await authApi.getRoles();
        setRoles(rolesRes.data || []);
        if (canManageInvites) {
          const invRes = await authApi.getInvitations();
          setInvitations(invRes.data || []);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canManageInvites]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    setInviteSuccess(null);
    try {
      await authApi.sendInvite({ email: inviteEmail.trim(), roleId: inviteRoleId || undefined });
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteRoleId('');
      const invRes = await authApi.getInvitations();
      setInvitations(invRes.data || []);
      setTimeout(() => setInviteSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleInvitationAction = async (id, action) => {
    try {
      await authApi.handleInvitation(id, action);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      if (action === 'ACCEPT') {
        fetchMembers(memberSearch, memberPage);
      }
    } catch (err) {
      setError(err.message || 'Failed to process invitation');
    }
  };

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      await authApi.updateMember(userId, { roleId: newRoleId });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId ? { ...m, roleId: newRoleId, roleName: roles.find((r) => r.id === newRoleId)?.name } : m
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to update member role');
    }
  };

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<Loader variant="line" />}>
      <div>
        <SettingsTabs
          title="Organization settings"
          subtitle={user?.orgName || 'Your organization'}
        />

        <div style={{ maxWidth: '680px', paddingTop: SPACING.xl }}>


          {/* Invite Section */}
          {canManageInvites && (
            <>
              <SectionTitle title="Invite members" subtitle="Send an invite link via email" />
              <div
                style={{
                  padding: SPACING.md,
                  background: COLORS.background.primary,
                  border: `1px solid ${COLORS.border.light}`,
                  borderRadius: BORDER_RADIUS.lg,
                  marginBottom: SPACING.xl,
                }}
              >
                <div style={{ ...FRSC, gap: SPACING.sm }}>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="colleague@company.com"
                    type="email"
                  />
                  <select
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      border: `1px solid ${COLORS.border.light}`,
                      borderRadius: BORDER_RADIUS.md,
                      fontSize: FONT.size.sm,
                      background: COLORS.background.primary,
                    }}
                  >
                    <option value="">Select role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? 'Sending...' : 'Send invite'}
                  </Button>
                </div>
                {inviteSuccess && (
                  <p style={{ fontSize: FONT.size.xs, color: COLORS.status.successDark, marginTop: SPACING.xs, margin: 0 }}>
                    {inviteSuccess}
                  </p>
                )}
                {error && typeof error === 'string' && (
                  <p style={{ fontSize: FONT.size.xs, color: COLORS.status.errorDark, marginTop: SPACING.xs, margin: 0 }}>
                    {error}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Pending invitations / access requests */}
          {canManageInvites && invitations.length > 0 && (
            <>
              <SectionTitle title="Pending" subtitle="Invitations and access requests awaiting action" />
              <div
                style={{
                  border: `1px solid ${COLORS.border.light}`,
                  borderRadius: BORDER_RADIUS.lg,
                  overflow: 'hidden',
                }}
              >
                {invitations.map((inv, i) => (
                  <div
                    key={inv.id}
                    style={{
                      ...FRBC,
                      padding: `${SPACING.sm} ${SPACING.md}`,
                      borderTop: i > 0 ? `1px solid ${COLORS.border.light}` : 'none',
                      background: COLORS.background.primary,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: FONT.size.md, marginBottom: '6px', margin: 0 }}>
                        <Chip
                          label={inv.inviteType === 'REQUEST' ? 'Request' : 'Invited'}
                          colorScheme={inv.inviteType === 'REQUEST' ? 'warning' : 'teal'}
                          style={{ padding: '0px', paddingRight: '7px' }}
                        />
                        {inv.email}
                        <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginLeft: '6px' }}>
                          {inv.roleName && ` [${inv.roleName}]`}
                        </span>
                      </p>
                      <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0, marginTop: '5px' }}>
                        {inv.invitedByName && `by ${inv.invitedByName} · `}
                        {inv.createdAt && new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {inv.inviteType === 'REQUEST' && (
                      <div style={{ ...FRSC, gap: '6px' }}>
                        <Button size="sm" onClick={() => handleInvitationAction(inv.id, 'ACCEPT')}>
                          Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleInvitationAction(inv.id, 'REJECT')}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {inv.inviteType === 'INVITE' && (
                      <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>Pending</span>
                    )}
                  </div>
                ))}
              </div>
              <Divider />
            </>
          )}

          {/* Members List */}
          <div
            style={{
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.lg,
              padding: SPACING.lg,
              background: COLORS.background.primary,
            }}
          >
            <SectionTitle
              title="Members"
              subtitle={`${totalMembers} member${totalMembers !== 1 ? 's' : ''} in your organization`}
            />

            {/* Search */}
            <div style={{ marginBottom: SPACING.sm }}>
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members by name or email..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1px solid ${COLORS.border.light}`,
                  borderRadius: BORDER_RADIUS.md,
                  fontSize: FONT.size.sm,
                  boxSizing: 'border-box',
                  background: COLORS.background.primary,
                }}
              />
            </div>

            <div style={{ overflow: 'hidden' }}>
              {members.length === 0 ? (
                <div style={{ padding: SPACING.lg, textAlign: 'center', color: COLORS.text.tertiary, fontSize: FONT.size.sm }}>
                  {memberSearch ? `No members matching "${memberSearch}"` : 'No members found'}
                </div>
              ) : (
                members.map((member, i) => (
                  <div
                    key={member.id}
                    style={{
                      ...FRBC,
                      padding: `${SPACING.sm} ${SPACING.md}`,
                      borderTop: i > 0 ? `1px solid ${COLORS.border.light}` : 'none',
                      background: COLORS.background.primary,
                    }}
                  >
                    <div style={{ ...FRSC, gap: SPACING.sm }}>
                      <Avatar initials={member.displayInitials} color={member.avatarColor} />
                      <div>
                        <p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, margin: 0 }}>
                          {member.fullName}
                          {member.id === user?.id && (
                            <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginLeft: '6px' }}>(you)</span>
                          )}
                        </p>
                        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>{member.email}</p>
                      </div>
                    </div>
                    <div style={{ ...FRSC, gap: SPACING.xs }}>
                      {canManageMembers && member.id !== user?.id ? (
                        <select
                          value={member.roleId || ''}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            border: `1px solid ${COLORS.border.light}`,
                            borderRadius: BORDER_RADIUS.sm,
                            fontSize: FONT.size.xs,
                            background: COLORS.background.primary,
                            cursor: 'pointer',
                          }}
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Chip label={member.roleName || 'No role'} colorScheme="purple" />
                      )}
                      {!member.active && (
                        <span style={{ fontSize: FONT.size.xs, color: COLORS.status.errorDark }}>Disabled</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ ...FRSC, justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.sm }}>
              <button
                disabled={memberPage === 0}
                onClick={() => setMemberPage((p) => p - 1)}
                style={{
                  padding: '4px 10px',
                  border: `1px solid ${COLORS.border.light}`,
                  borderRadius: BORDER_RADIUS.sm,
                  fontSize: FONT.size.xs,
                  background: memberPage === 0 ? COLORS.background.secondary : '#fff',
                  color: memberPage === 0 ? COLORS.text.tertiary : COLORS.text.primary,
                  cursor: memberPage === 0 ? 'default' : 'pointer',
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                Page {memberPage + 1} of {totalPages}
              </span>
              <button
                disabled={memberPage >= totalPages - 1}
                onClick={() => setMemberPage((p) => p + 1)}
                style={{
                  padding: '4px 10px',
                  border: `1px solid ${COLORS.border.light}`,
                  borderRadius: BORDER_RADIUS.sm,
                  fontSize: FONT.size.xs,
                  background: memberPage >= totalPages - 1 ? COLORS.background.secondary : '#fff',
                  color: memberPage >= totalPages - 1 ? COLORS.text.tertiary : COLORS.text.primary,
                  cursor: memberPage >= totalPages - 1 ? 'default' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}

        </div>
      </div>
    </ApiGuard>
  );
};

export default MembersPage;
