import React from 'react';
import { Button } from '../../common';
import SettingsSectionHeader from '../SettingsSectionHeader';

export const InviteMembersCard = ({
  inviteEmail,
  onInviteEmailChange,
  inviteRoleId,
  onInviteRoleIdChange,
  roles = [],
  onInvite,
  inviting = false,
  inviteSuccess,
  error,
}) => (
  <div id="invite-members-section">
    <SettingsSectionHeader
      id="invite-members-header"
      title="Invite members"
      subtitle="Send an invite link via email"
    />
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => onInviteEmailChange(e.target.value)}
          placeholder="colleague@company.com"
          className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
        />
        <select
          value={inviteRoleId}
          onChange={(e) => onInviteRoleIdChange(e.target.value)}
          className="text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-600 shrink-0"
        >
          <option value="">Select role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <Button
          onClick={onInvite}
          disabled={inviting || !inviteEmail.trim()}
          variant="primary"
          size="md"
        >
          {inviting ? 'Sending...' : 'Send invite'}
        </Button>
      </div>

      {inviteSuccess && (
        <p className="text-xs text-emerald-600 font-medium mt-2 mb-0">
          {inviteSuccess}
        </p>
      )}
      {error && typeof error === 'string' && (
        <p className="text-xs text-rose-600 font-medium mt-2 mb-0">
          {error}
        </p>
      )}
    </div>
  </div>
);

export default InviteMembersCard;
