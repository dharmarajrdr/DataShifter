import React, { useEffect, useRef, useState } from 'react';
import { ConfirmationModal } from '../common';
import ConnectionDbIcon from './ConnectionDbIcon';
import { useNotification } from '../../contexts/NotificationContext';
import { connectionApi } from '../../services/api';

export const ConnectionCard = ({
  conn, onEdit, onDelete, onUpdate, onBrowse,
  canEdit, canDelete, canTest, canBrowse, id,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notification = useNotification();
  const isReferenced = (conn.pipelineCount || 0) > 0;
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleTest = async () => {
    if (!canTest) return;
    setTesting(true);
    setTestResult(null);
    onUpdate?.(conn.id, { status: 'TESTING' });
    try {
      const res = await connectionApi.test(conn.id);
      setTestResult(res.data);
      timerRef.current = setTimeout(() => setTestResult(null), 3000);
      notification[res.data?.success ? 'success' : 'error'](res.data?.success ? `Connection to "${conn.name}" tested successfully` : (res.data?.message || 'Connection test failed'));
      onUpdate?.(conn.id, { status: res.data?.success ? 'CONNECTED' : 'FAILED', error: res.data?.success ? null : res.data?.message });
    } catch (e) {
      setTestResult({ success: false, message: e.message });
      timerRef.current = setTimeout(() => setTestResult(null), 3000);
      notification.error(e.message || 'Connection test failed');
      onUpdate?.(conn.id, { status: 'FAILED', error: e.message });
    } finally { setTesting(false); }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      await connectionApi.delete(conn.id);
      notification.success(`Connection "${conn.name}" deleted successfully`);
      onDelete(conn.id);
    } catch (e) { notification.error(e.message || 'Failed to delete connection'); }
    finally { setConfirmDelete(false); }
  };

  const isFailed = conn.status === 'FAILED';
  const isTesting = conn.status === 'TESTING' || testing;
  const statusBadge = isFailed ? { text: 'Auth Failure', cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' }
    : isTesting ? { text: 'Testing', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse' }
    : { text: 'Connected', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };

  return (
    <div id={id || `conn-card-${conn.id}`} className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ConnectionDbIcon dbType={conn.dbType} id={`${conn.id}-icon`} />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{conn.name}</h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{conn.dbType} • {conn.host || 'Direct'}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusBadge.cls}`}>
            <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />{statusBadge.text}
          </span>
        </div>

        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between items-center"><span className="text-slate-500">Endpoint:</span><span className="font-mono text-slate-800 truncate max-w-[200px]">{conn.host}{conn.port ? `:${conn.port}` : ''}</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-500">Database:</span><span className="font-semibold text-slate-800 truncate max-w-[200px]">{conn.databaseName || conn.schemaName || 'default'}</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-500">Active Pipelines:</span><span className="font-bold text-indigo-600">{conn.pipelineCount ? `${conn.pipelineCount} Pipelines` : 'None'}</span></div>
        </div>

        {conn.error && <div className="mt-2.5 p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium truncate">{conn.error}</div>}
        {testResult && <div className={`mt-2.5 p-2 rounded-lg text-xs font-medium border ${testResult.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{testResult.success ? `Connected (${testResult.latencyMs}ms)` : testResult.message}</div>}
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button type="button" onClick={() => onBrowse?.(conn)} disabled={!canBrowse} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors disabled:opacity-50">
          <i className="fa-solid fa-table-list text-[11px] text-slate-500" />Inspect Schema ({conn.tableCount || 0} Tables)
        </button>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={handleTest} disabled={!canTest || testing} className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors disabled:opacity-50">{testing ? 'Testing...' : (isFailed ? 'Retry' : 'Test')}</button>
          <button type="button" onClick={() => onEdit?.(conn)} disabled={!canEdit} className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors disabled:opacity-50">Edit</button>
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={!canDelete || isReferenced} className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-lg transition-colors disabled:opacity-40">Delete</button>
        </div>
      </div>
      <ConfirmationModal isOpen={confirmDelete && !isReferenced && canDelete} title="Delete Connection" message={`Are you sure you want to delete connection "${conn.name}" permanently?`} color="#EF4444" onClose={() => setConfirmDelete(false)} actions={[{ label: 'Cancel', variant: 'secondary', onClick: () => setConfirmDelete(false) }, { label: 'Yes, delete', variant: 'danger', onClick: handleDelete }]} />
    </div>
  );
};

export default ConnectionCard;
