import React from 'react';
import { Button, Chip } from '../../common';

export const RoleAccordionItem = ({ role, roleMembers, isExpanded, onToggleExpand, onEdit, onDelete, canManage }) => {
  const isAgentRole = String(role.name || '').toLowerCase() === 'agent';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all">
      <div className="flex items-center justify-between p-4 px-5 cursor-pointer select-none hover:bg-slate-50/50" onClick={onToggleExpand}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-400 text-xs w-3.5 flex justify-center">
            <i className={isExpanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{role.name}</span>
              {role.system && <Chip label="System" colorScheme="default" style={{ fontSize: '9px' }} />}
              {isAgentRole && <Chip label="AI Agent Only" colorScheme="purple" style={{ fontSize: '9px' }} />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{role.description || 'No description'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs text-slate-400 font-medium">
          <span>{isAgentRole ? 'Assigned to Beetel' : `${roleMembers.length} member${roleMembers.length !== 1 ? 's' : ''}`}</span>
          <span className="hidden sm:inline">{role.permissions?.length || 0} permissions</span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 flex flex-col gap-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Permissions</h4>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions && role.permissions.length > 0 ? (
                role.permissions.map((p) => (
                  <span key={p} className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                    {p}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No permissions assigned</span>
              )}
            </div>
          </div>

          {roleMembers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Assigned Members</h4>
              <div className="flex flex-wrap gap-2">
                {roleMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 pl-1 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-full">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                      style={{ background: m.avatarColor || '#3B82F6' }}
                    >
                      {m.displayInitials || m.fullName?.[0] || 'U'}
                    </div>
                    <span className="text-xs text-slate-700 font-medium">{m.fullName || m.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canManage && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => onEdit(role)}>Edit permissions</Button>
              {!role.system && <Button variant="danger" size="sm" onClick={() => onDelete(role)}>Delete role</Button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleAccordionItem;
