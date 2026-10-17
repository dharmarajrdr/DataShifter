import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoIcon } from '../Icons';
import { APP } from '../../../constants/literals';

/**
 * Sidebar header with brand logo and title.
 */
export const SidebarHeader = ({
  id = 'sidebar-header',
  className = '',
  isCollapsed = false,
}) => {
  const navigate = useNavigate();

  return (
    <div
      id={id}
      className={`h-14 flex items-center border-b border-surface-200 bg-white ${
        isCollapsed ? 'justify-center px-0' : 'px-4'
      } ${className}`}
    >
      <div
        id="sidebar-brand-btn"
        className={`flex items-center gap-2.5 cursor-pointer select-none overflow-hidden ${
          isCollapsed ? 'justify-center' : ''
        }`}
        onClick={() => navigate('/pipelines')}
        title={APP.name}
      >
        <LogoIcon size={24} color="#4F46E5" />
        {!isCollapsed && (
          <span className="font-bold text-base text-content-primary tracking-tight whitespace-nowrap">
            {APP.name}
          </span>
        )}
      </div>
    </div>
  );
};

export default SidebarHeader;
