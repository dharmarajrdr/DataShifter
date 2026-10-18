import React from 'react';
import { Button, Chip } from '../../common';
import SettingsSectionHeader from '../SettingsSectionHeader';

export const PendingInvitesCard = ({
  invitations = [],
  onAction,
}) => (
  <div id="pending-invites-section">
    <SettingsSectionHeader
      id="pending-invites-header"
      title="Pending"
      subtitle="Invitations and access requests awaiting action"
    />
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
      {invitations.map((inv) => (
        <div key={inv.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Chip
                label={inv.inviteType === 'REQUEST' ? 'Request' : 'Invited'}
                colorScheme={inv.inviteType === 'REQUEST' ? 'warning' : 'teal'}
              />
              <span className="text-xs font-semibold text-slate-900">{inv.email}</span>
              {inv.roleName && (
                <span className="text-xs text-slate-500 font-medium">[{inv.roleName}]</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 mb-0">
              {inv.invitedByName && `by ${inv.invitedByName} · `}
              {inv.createdAt && new Date(inv.createdAt).toLocaleDateString()}
            </p>
          </div>

          {inv.inviteType === 'REQUEST' && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => onAction(inv.id, 'ACCEPT')}>
                Approve
              </Button>
              <Button size="sm" variant="danger" onClick={() => onAction(inv.id, 'REJECT')}>
                Reject
              </Button>
            </div>
          )}

          {inv.inviteType === 'INVITE' && (
            <span className="text-xs text-slate-400 font-medium">Pending response</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default PendingInvitesCard;
