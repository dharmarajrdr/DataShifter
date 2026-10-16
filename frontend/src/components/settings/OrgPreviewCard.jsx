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
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div
      id={id}
      className="ds-org-preview-card bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-xs flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div
          id={`${id}-avatar`}
          className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600 overflow-hidden shrink-0 shadow-xs"
        >
          {logoUrl?.trim() ? (
            <img
              src={logoUrl.trim()}
              alt={name || 'Org'}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            (name || fallbackInitial).charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h2 id={`${id}-name`} className="text-base font-bold text-slate-900 leading-tight">
            {name || 'Organization'}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
            {memberCount !== undefined && (
              <span id={`${id}-members`} className="inline-flex items-center gap-1 font-medium">
                <i className="fa-solid fa-users text-[11px] text-slate-400" />
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
            )}
            {formattedDate && (
              <span id={`${id}-created`} className="text-slate-400">
                · Created {formattedDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgPreviewCard;
