import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const SettingsTabs = ({
  title = 'Organization Settings',
  subtitle = 'Manage profile, authentication policies, audit retention, and enterprise quotas',
  actions,
}) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const tabs = [
    { label: 'General Profile', path: '/settings/org', show: true, icon: <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M10 3h4v4h-4z" /> },
    { label: 'Members', path: '/settings/members', show: hasPermission('org:manage_members') || hasPermission('org:manage_invites') || !!user?.orgOwner, icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
    { label: 'Roles & RBAC', path: '/settings/roles', show: hasPermission('org:manage_roles'), icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
    { label: 'API Keys', path: '/settings/api-keys', show: true, icon: <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /> },
    { label: 'Billing & Subscription', path: '/settings/billing', show: !!user?.orgOwner, icon: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></> },
  ];

  return (
    <div id="settings-tabs-header" className="flex flex-col mb-5 w-full select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      <div id="settings-tabs-list" className="flex items-center gap-5 border-b border-slate-200 mt-4">
        {tabs.filter((t) => t.show).map((tab) => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.path}
              id={`tab-${tab.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all -mb-[1px] cursor-pointer whitespace-nowrap ${
                active ? 'text-indigo-600 border-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800 border-transparent'
              }`}
            >
              <svg className="w-3.5 h-3.5 stroke-current fill-none shrink-0" strokeWidth="2" viewBox="0 0 24 24">{tab.icon}</svg>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsTabs;