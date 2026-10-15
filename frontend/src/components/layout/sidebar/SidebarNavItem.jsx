import React from 'react';
import Tooltip from '../../common/Tooltip';

/**
 * Individual sidebar navigation link with active states and collapsed tooltip.
 */
export const SidebarNavItem = ({
  id,
  className = '',
  item,
  isActive = false,
  isCollapsed = false,
  onClick,
}) => {
  const Icon = item.icon;

  const content = (
    <button
      id={id || `nav-item-${item.path.replace('/', '')}`}
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
        ${isActive
          ? 'bg-brand-50 text-brand-700 font-semibold shadow-subtle'
          : 'text-content-secondary hover:text-content-primary hover:bg-surface-100'}
        ${isCollapsed ? 'justify-center px-0' : ''} ${className}`}
    >
      <Icon
        size={18}
        className={isActive ? 'text-brand' : 'text-content-secondary'}
        aria-hidden="true"
      />
      {!isCollapsed && (
        <span className="whitespace-nowrap overflow-hidden text-ellipsis text-left flex-1">
          {item.label}
        </span>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip text={item.label} position="right">
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default SidebarNavItem;
