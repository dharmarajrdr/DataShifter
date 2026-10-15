import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoIcon } from '../Icons';
import { APP } from '../../../constants/literals';

/**
 * Sidebar header with brand logo, title, and collapse toggle button.
 */
export const SidebarHeader = ({
  id = 'sidebar-header',
  className = '',
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const navigate = useNavigate();

  return (
    <div
      id={id}
      className={`h-14 flex items-center justify-between px-3.5 border-b border-surface-200 bg-white ${className}`}
    >
      <div
        id="sidebar-brand-btn"
        className="flex items-center gap-2 cursor-pointer select-none overflow-hidden"
        onClick={() => navigate('/pipelines')}
        title={APP.name}
      >
        <LogoIcon size={22} color="#4F46E5" />
        {!isCollapsed && (
          <span className="font-bold text-base text-content-primary tracking-tight whitespace-nowrap">
            {APP.name}
          </span>
        )}
      </div>

      <button
        id="sidebar-collapse-toggle"
        type="button"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!isCollapsed}
        className="p-1.5 rounded-md text-content-secondary hover:text-content-primary hover:bg-surface-100 transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
};

export default SidebarHeader;
