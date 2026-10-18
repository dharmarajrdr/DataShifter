import React from 'react';

/**
 * Standard settings section header for consistent font sizes and margins (<= 100 lines).
 */
export const SettingsSectionHeader = ({
  id,
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div id={id} className={`flex items-center justify-between gap-4 mb-3.5 ${className}`}>
    <div>
      <h3 className="text-base font-semibold text-slate-900 m-0 tracking-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-0.5 mb-0">
          {subtitle}
        </p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export default SettingsSectionHeader;
