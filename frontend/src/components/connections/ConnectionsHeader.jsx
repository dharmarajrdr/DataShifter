import React from 'react';
import { Button } from '../common';

export const ConnectionsHeader = ({
  id = 'connections-header',
  className = '',
  canCreate = false,
  onNewConnection,
  onTestAll,
  testingAll = false,
}) => {
  return (
    <div
      id={id}
      className={`ds-connections-header flex items-center justify-between flex-wrap gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center text-lg shrink-0 shadow-xs">
          <svg className="w-6 h-6 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id={`${id}-title`} className="text-lg font-bold text-slate-900 leading-tight">
              Connections Manager
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Gateway
            </span>
          </div>
          <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">
            Manage database drivers, streaming clusters, and object storages across all pipelines
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          id={`${id}-btn-test-all`}
          variant="secondary"
          onClick={onTestAll}
          disabled={testingAll}
          title="Test connectivity of all active connections"
        >
          <i className={`fa-solid ${testingAll ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'} mr-1.5`} />
          {testingAll ? 'Testing...' : 'Test All Health'}
        </Button>
        <Button
          id={`${id}-btn-new`}
          variant="primary"
          onClick={onNewConnection}
          disabled={!canCreate}
          title={!canCreate ? 'You do not have permission to create connections' : undefined}
        >
          <i className="fa-solid fa-plus mr-1.5" />
          Add Connection
        </Button>
      </div>
    </div>
  );
};

export default ConnectionsHeader;
