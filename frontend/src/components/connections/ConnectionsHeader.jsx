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
      className={`ds-connections-header flex items-center justify-between flex-wrap gap-4 bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
          <i className="fa-solid fa-network-wired" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id={`${id}-title`} className="text-lg font-bold text-slate-900 leading-tight">
              Connections Manager
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
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
