import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Settings header with title, subtitle, actions, and tabs using flex layout (<= 100 lines).
 */
export const SettingsTabs = ({ title, subtitle, actions }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const tabs = [
    { label: 'Organization', path: '/settings/org', show: true },
    { label: 'Members', path: '/settings/members', show: hasPermission('org:manage_members') || hasPermission('org:manage_invites') || !!user?.orgOwner },
    { label: 'Roles', path: '/settings/roles', show: hasPermission('org:manage_roles') },
    { label: 'API Keys', path: '/settings/api-keys', show: true },
    { label: 'Billing', path: '/settings/billing', show: !!user?.orgOwner },
  ];

  return (
    <div
      id="settings-tabs-header"
      className="ds-settings-tabs-header flex flex-col gap-3.5 mb-6 w-full"
    >
      {/* Header Title + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 flex-wrap">
        {tabs.filter(t => t.show).map(tab => {
          const active = pathname === tab.path;
          return (
            <div
              key={tab.path}
              id={`tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate(tab.path)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(tab.path); } }}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition -mb-[1px] cursor-pointer flex items-center select-none ${
                active
                  ? 'text-indigo-600 border-indigo-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 border-transparent'
              }`}
            >
              {tab.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsTabs;