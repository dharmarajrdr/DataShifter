import React from 'react';

export const PermissionGroupItem = ({ group, permissions, onToggleGroup, onTogglePerm }) => {
  const groupPerms = group.permissions.map((p) => p.key);
  const selectedCount = groupPerms.filter((p) => permissions.has(p)).length;
  const allSelected = selectedCount === groupPerms.length;

  return (
    <div className="border border-slate-200 rounded-lg mb-2 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-50 cursor-pointer select-none"
        onClick={() => onToggleGroup(group)}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            readOnly
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-800">{group.label}</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          {selectedCount}/{groupPerms.length}
        </span>
      </div>

      <div className="p-2.5 pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-white">
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
    </div>
  );
};

export default PermissionGroupItem;
