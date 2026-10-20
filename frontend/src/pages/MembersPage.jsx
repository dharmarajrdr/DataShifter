import React from 'react';
import { ApiGuard, BarLoader, ConfirmationModal, SkeletonLoader } from '../components/common';
import SettingsTabs from '../components/common/SettingsTabs';
import { InviteMembersCard, PendingInvitesCard, MembersListCard, useMembersData } from '../components/settings/members';

export const MembersPage = () => {
  const d = useMembersData();

  return (
    <ApiGuard error={d.error} loading={d.loading} loadingComponent={<div><BarLoader /><div className="w-full pt-6"><SkeletonLoader variant="rect" height="120px" count={1} /><SkeletonLoader variant="table-row" count={4} /></div></div>}>
      <div id="members-page" className="ds-members-page w-full max-w-7xl mx-auto pb-12 flex flex-col">
        <SettingsTabs title="Organization settings" subtitle={d.user?.orgName || 'Your organization'} />
        <div className="w-full flex flex-col gap-6">
          {d.canManageInvites && (
            <InviteMembersCard inviteEmail={d.inviteEmail} onInviteEmailChange={d.setInviteEmail} inviteRoleId={d.inviteRoleId} onInviteRoleIdChange={d.setInviteRoleId} roles={d.roles} onInvite={d.handleInvite} inviting={d.inviting} inviteSuccess={d.inviteSuccess} />
          )}
          {d.canManageInvites && d.invitations.length > 0 && (
            <PendingInvitesCard invitations={d.invitations} onAction={d.handleInvitationAction} />
          )}
          <MembersListCard members={d.members} totalMembers={d.totalMembers} searchQuery={d.memberSearch} onSearchChange={d.setMemberSearch} page={d.memberPage} totalPages={d.totalPages} onPageChange={d.setMemberPage} roles={d.roles} currentUserId={d.user?.id} canManage={d.canManageMembers} onRoleChange={d.handleRoleChange} onRemove={d.setMemberToRemove} />
          <ConfirmationModal isOpen={Boolean(d.memberToRemove)} title="Remove Member" message={`Are you sure you want to remove ${d.memberToRemove?.fullName || d.memberToRemove?.email} from the organization?`} color="#DC2626" onClose={() => d.setMemberToRemove(null)} actions={[{ label: 'Cancel', variant: 'secondary', onClick: () => d.setMemberToRemove(null) }, { label: 'Yes, remove', variant: 'danger', onClick: d.confirmRemoveMember, loading: d.removingMember, disabled: d.removingMember }]} />
        </div>
      </div>
    </ApiGuard>
  );
};

export default MembersPage;
