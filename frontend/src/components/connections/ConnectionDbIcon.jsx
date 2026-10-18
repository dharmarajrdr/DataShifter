import React from 'react';
import { OracleIcon, PostgresIcon, SpannerIcon } from '../layout/Icons';

export const ConnectionDbIcon = ({ dbType, id, className = '' }) => {
  const normalized = (dbType || 'POSTGRESQL').toUpperCase();

  const getIcon = () => {
    switch (normalized) {
      case 'ORACLE':
        return { bg: 'bg-rose-50 text-rose-600 border-rose-200', comp: <OracleIcon size={20} /> };
      case 'SPANNER':
        return { bg: 'bg-sky-50 text-sky-600 border-sky-200', comp: <SpannerIcon size={20} /> };
      case 'POSTGRESQL':
      case 'POSTGRES':
        return { bg: 'bg-indigo-50 text-indigo-600 border-indigo-200', comp: <PostgresIcon size={20} /> };
      case 'SNOWFLAKE':
        return { bg: 'bg-cyan-50 text-cyan-600 border-cyan-200', comp: <i className="fa-solid fa-snowflake text-base" /> };
      case 'KAFKA':
        return { bg: 'bg-amber-50 text-amber-600 border-amber-200', comp: <i className="fa-solid fa-bolt text-base" /> };
      case 'S3':
      case 'GCS':
      case 'AZUREBLOB':
        return { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', comp: <i className="fa-solid fa-box-archive text-base" /> };
      default:
        return { bg: 'bg-slate-100 text-slate-600 border-slate-200', comp: <i className="fa-solid fa-database text-base" /> };
    }
  };

  const { bg, comp } = getIcon();

  return (
    <div
      id={id}
      className={`ds-conn-db-icon w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${bg} ${className}`}
    >
      {comp}
    </div>
  );
};

export default ConnectionDbIcon;
