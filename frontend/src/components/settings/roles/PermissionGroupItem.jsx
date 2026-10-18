import React, { useState } from 'react';

export const PermissionGroupItem = ({ group, permissions, onToggleGroup, onTogglePerm, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const groupPerms = group.permissions.map((p) => p.key);
  const selectedCount = groupPerms.filter((p) => permissions.has(p)).length;
  const allSelected = selectedCount === groupPerms.length;

  return (
    <div className="border border-slate-200 rounded-lg mb-2 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/70 cursor-pointer select-none transition-colors"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs w-3.5 flex justify-center">
            <i className={isExpanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'} />
          </span>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = selectedCount > 0 && !allSelected; }}
            onChange={() => onToggleGroup(group)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-800">{group.label}</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          {selectedCount}/{groupPerms.length}
        </span>
      </div>

      {isExpanded && (
        <div className="p-2.5 pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-white border-t border-slate-100">
          {group.permissions.map((perm) => {
            const checked = permissions.has(perm.key);
            return (
              <div
                key={perm.key}
                onClick={() => onTogglePerm(perm.key)}
                className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-slate-700 leading-tight">{perm.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">{perm.key}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PermissionGroupItem;
