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
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${className}`}
    >
      <div id={`${id}-heading-group`} className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-slate-900">
            Connections Manager
          </h1>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Live Gateway
          </span>
        </div>
        <p id={`${id}-subtitle`} className="text-sm text-slate-500">
          Manage database drivers, streaming clusters, and object storages across all pipelines
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
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
