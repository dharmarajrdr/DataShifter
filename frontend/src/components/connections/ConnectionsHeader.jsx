import React from 'react';
import { Button } from '../common';
import { CONNECTION } from '../../constants/literals';

export const ConnectionsHeader = ({
  id = 'connections-header',
  className = '',
  totalCount = 0,
  connectedCount = 0,
  canCreate = false,
  onNewConnection,
}) => {
  return (
    <div
      id={id}
      className={`ds-connections-header flex items-center justify-between flex-wrap gap-4 bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-xs ${className}`}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 id={`${id}-title`} className="text-xl font-bold text-slate-900 leading-tight">
            {CONNECTION.title}
          </h1>
          <span
            id={`${id}-badge`}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
          >
            {connectedCount} / {totalCount} Connected
          </span>
        </div>
        <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-1">
          {CONNECTION.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          id={`${id}-btn-new`}
          variant="primary"
          onClick={onNewConnection}
          disabled={!canCreate}
          title={!canCreate ? 'You do not have permission to create connections' : undefined}
        >
          <i className="fa-solid fa-plus mr-1.5" />
          {CONNECTION.newConnection}
        </Button>
      </div>
    </div>
  );
};

export default ConnectionsHeader;
