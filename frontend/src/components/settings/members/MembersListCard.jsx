import React from 'react';
import { Button, Chip } from '../../common';
import SettingsSectionHeader from '../SettingsSectionHeader';

export const MembersListCard = ({
  members = [],
  totalMembers = 0,
  searchQuery,
  onSearchChange,
  page = 0,
  totalPages = 0,
  onPageChange,
  roles = [],
  currentUserId,
  canManage = false,
  onRoleChange,
  onRemove,
}) => (
  <div id="members-list-section">
    <SettingsSectionHeader id="members-list-header" title="Members" subtitle={`${totalMembers} member${totalMembers !== 1 ? 's' : ''} in your organization`} />
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search members by name or email..." className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600" />
      <div className="divide-y divide-slate-100 overflow-hidden">
        {members.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">{searchQuery ? `No members matching "${searchQuery}"` : 'No members found'}</div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div style={{ backgroundColor: m.avatarColor || '#4F46E5' }} className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold">{m.displayInitials || '?'}</div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 m-0">{m.fullName}{m.id === currentUserId && <span className="text-[11px] text-slate-400 font-normal ml-1.5">(you)</span>}</p>
                  <p className="text-[11px] text-slate-500 m-0">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && m.id !== currentUserId ? (
                  <>
                    <select value={m.roleId || ''} onChange={(e) => onRoleChange(m.id, e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer">
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <Button variant="danger" size="sm" onClick={() => onRemove(m)}>Remove</Button>
                  </>
                ) : <Chip label={m.roleName || 'No role'} colorScheme="purple" />}
              </div>
            </div>
          ))
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Prev</Button>
          <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="secondary" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  </div>
);

export default MembersListCard;
