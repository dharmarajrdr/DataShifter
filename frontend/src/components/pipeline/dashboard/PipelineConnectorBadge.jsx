import React from 'react';

const getConnectorStyle = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('postgre') || n.includes('pg') || n.includes('sql') || n.includes('mysql')) {
    return { icon: 'fa-solid fa-database', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
  }
  if (n.includes('oracle') || n.includes('ora')) {
    return { icon: 'fa-solid fa-server', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
  }
  if (n.includes('snow') || n.includes('lake') || n.includes('dw')) {
    return { icon: 'fa-solid fa-snowflake', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' };
  }
  if (n.includes('s3') || n.includes('bucket') || n.includes('cloud') || n.includes('rest')) {
    return { icon: 'fa-solid fa-cloud', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
  }
  if (n.includes('kafka') || n.includes('topic') || n.includes('stream')) {
    return { icon: 'fa-solid fa-share-nodes', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' };
  }
  if (n.includes('hana') || n.includes('sap')) {
    return { icon: 'fa-solid fa-cubes', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
  }
  return { icon: 'fa-solid fa-hard-drive', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
};

export const PipelineConnectorBadge = ({
  id = 'connector-badge',
  className = '',
  name = 'Connector',
}) => {
  const style = getConnectorStyle(name);

  return (
    <span
      id={id}
      className={`ds-connector-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium text-slate-700 bg-white border-slate-200 shadow-2xs max-w-full ${className}`}
      title={name}
    >
      <span
        id={`${id}-icon-tag`}
        className={`ds-connector-icon-tag w-4 h-4 rounded flex items-center justify-center shrink-0 border ${style.bg} ${style.text} ${style.border}`}
      >
        <i id={`${id}-icon`} className={`${style.icon} text-[9px]`} />
      </span>
      <span
        id={`${id}-name`}
        className="ds-connector-name truncate max-w-[130px] font-medium text-slate-700 text-[11.5px]"
      >
        {name}
      </span>
    </span>
  );
};

export default PipelineConnectorBadge;
