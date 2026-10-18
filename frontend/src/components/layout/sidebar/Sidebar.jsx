import React, { useState } from 'react';
import SidebarHeader from './SidebarHeader';
import SidebarNav from './SidebarNav';
import SidebarNotifications from './SidebarNotifications';
import SidebarFooter from './SidebarFooter';

const STORAGE_KEY = 'is_collapse';

const getInitialCollapsed = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('is_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
};

/**
 * Collapsible responsive Sidebar navigation component (<= 100 lines).
 */
export const Sidebar = ({
  id = 'app-sidebar',
  className = '',
  isCollapsed: controlledCollapsed,
  onToggleCollapse: controlledToggle,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(getInitialCollapsed);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = controlledToggle || (() => {
    setInternalCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  });

  return (
    <aside
      id={id}
      aria-label="Application Sidebar"
      className={`fixed left-0 top-0 h-screen z-40 bg-white border-r border-surface-200 flex flex-col transition-all duration-200 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'} ${className}`}
    >
      <SidebarHeader
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <SidebarNav isCollapsed={isCollapsed} />

      <div className="mt-auto flex flex-col">
        <SidebarNotifications isCollapsed={isCollapsed} />
        <SidebarFooter isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
};

export default Sidebar;
