import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Library, Activity, Code2 } from 'lucide-react';
import { PipelineIcon, WorkflowIcon, ConnectionIcon, SettingsIcon, NotifyHubIcon, BeetelIcon } from '../Icons';
import SidebarNavItem from './SidebarNavItem';

export const NAV_ITEMS = [
  { label: 'Pipelines', path: '/pipelines', icon: PipelineIcon },
  { label: 'Monitoring', path: '/monitoring', icon: Activity },
  { label: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
  { label: 'Library', path: '/udfs', icon: Library },
  { label: 'Workflows', path: '/workflows', icon: WorkflowIcon },
  { label: 'Connections', path: '/connections', icon: ConnectionIcon },
  { label: 'Agent', path: '/beetel', icon: BeetelIcon },
  { label: 'NotifyHub', path: '/notifyhub', icon: NotifyHubIcon },
  { label: 'Settings', path: '/settings/org', icon: SettingsIcon },
];

/**
 * Sidebar navigation list containing primary domain sections.
 */
export const SidebarNav = ({
  id = 'sidebar-nav',
  className = '',
  isCollapsed = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/settings/org') return location.pathname.startsWith('/settings');
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav id={id} aria-label="Main Navigation" className={`flex-1 overflow-y-auto px-2 py-3 space-y-1 ${className}`}>
      {NAV_ITEMS.map((item) => (
        <SidebarNavItem
          key={item.path}
          item={item}
          isActive={isActive(item.path)}
          isCollapsed={isCollapsed}
          onClick={() => navigate(item.path)}
        />
      ))}
    </nav>
  );
};

export default SidebarNav;
