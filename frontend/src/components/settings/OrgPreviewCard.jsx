import React from 'react';

export const OrgPreviewCard = ({
  id = 'org-preview-card',
  name,
  logoUrl,
  memberCount,
  createdAt,
  fallbackInitial = 'O',
}) => {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div id={id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-3.5">
        <div
          id={`${id}-avatar`}
          className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600 overflow-hidden shrink-0 shadow-xs"
        >
          {logoUrl?.trim() ? (
            <img src={logoUrl.trim()} alt={name || 'Org'} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            (name || fallbackInitial).charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h2 id={`${id}-name`} className="text-sm font-bold text-slate-900 leading-tight truncate">
            {name || 'Organization'}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
            {memberCount !== undefined && (
              <span id={`${id}-members`} className="inline-flex items-center gap-1 font-medium">
                <i className="fa-solid fa-users text-[10px] text-slate-400" />
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
            )}
            {formattedDate && <span className="text-slate-400">· Created {formattedDate}</span>}
          </div>
        </div>
      </div>

      <div className="pt-3.5 border-t border-slate-100 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Workspace Cluster
        </div>
        <div className="font-mono text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
          aws-us-east-1.datashifter.io
        </div>
        <div className="text-xs text-slate-500">
          Engine Version: <strong className="text-slate-700 font-semibold">v2.4.12-enterprise</strong>
        </div>
      </div>
    </div>
  );
};

export default OrgPreviewCard;
