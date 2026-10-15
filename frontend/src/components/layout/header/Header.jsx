import React from 'react';
import { useLocation, Link } from 'react-router-dom';

/**
 * Minimal Header bar (Option 2) with clean breadcrumbs and page actions (<= 100 lines).
 */
export const Header = ({
  id = 'app-header',
  className = '',
  breadcrumbs,
  actions,
}) => {
  const location = useLocation();

  const defaultCrumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((part, index, arr) => {
      const url = `/${arr.slice(0, index + 1).join('/')}`;
      const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      const isLast = index === arr.length - 1;
      return { label, url, isLast };
    });

  const crumbs = breadcrumbs || defaultCrumbs;

  return (
    <header
      id={id}
      className={`sticky top-0 z-30 h-[50px] bg-white/95 backdrop-blur-sm border-b border-surface-200 px-6 flex items-center justify-between shrink-0 select-none shadow-xs transition-shadow ${className}`}
    >
      <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-content-secondary">
        <Link to="/pipelines" className="hover:text-content-primary transition-colors">App</Link>
        {crumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.url || idx}>
            <span className="text-surface-300" aria-hidden="true">/</span>
            {crumb.isLast ? (
              <span className="font-semibold text-content-primary truncate max-w-[200px]" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.url} className="hover:text-content-primary transition-colors truncate max-w-[150px]">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {actions && (
        <div id={id ? `${id}-actions` : undefined} className="flex items-center gap-2.5">
          {actions}
        </div>
      )}
    </header>
  );
};

export default Header;
