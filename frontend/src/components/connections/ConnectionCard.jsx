import React, { useEffect, useRef, useState } from 'react';
import { Button, ConfirmationModal, StatusBadge } from '../common';
import ConnectionDbIcon from './ConnectionDbIcon';
import { COLORS } from '../../constants/design';
import { CONNECTION } from '../../constants/literals';
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
  const testTimerRef = useRef(null);

  useEffect(() => () => { if (testTimerRef.current) clearTimeout(testTimerRef.current); }, []);

  const handleTest = async () => {
    if (!canTest) return;
    setTesting(true);
    setTestResult(null);
    onUpdate?.(conn.id, { status: 'TESTING' });
    try {
      const res = await connectionApi.test(conn.id);
      setTestResult(res.data);
      testTimerRef.current = setTimeout(() => setTestResult(null), 3000);
      notification[res.data?.success ? 'success' : 'error'](
        res.data?.success ? `Connection to "${conn.name}" tested successfully` : (res.data?.message || 'Connection test failed')
      );
      onUpdate?.(conn.id, { status: res.data?.success ? 'CONNECTED' : 'FAILED', error: res.data?.success ? null : res.data?.message });
    } catch (e) {
      setTestResult({ success: false, message: e.message });
      testTimerRef.current = setTimeout(() => setTestResult(null), 3000);
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

  const cardId = id || `conn-card-${conn.id}`;

  return (
    <div id={cardId} className="ds-connection-card bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <ConnectionDbIcon dbType={conn.dbType} id={`${cardId}-icon`} />
            <div>
              <p id={`${cardId}-name`} className="text-sm font-bold text-slate-900">{conn.name}</p>
              <p id={`${cardId}-host`} className="text-xs text-slate-500 font-mono mt-0.5">{conn.host}</p>
            </div>
          </div>
          <StatusBadge status={conn.status} label={CONNECTION.statuses[conn.status]} />
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100 flex-wrap">
          <span>Type: <strong className="text-slate-800">{conn.dbType}</strong></span>
          <span>Schema: <strong className="text-slate-800">{conn.schemaName}</strong></span>
          <span>Tables: <strong className="text-slate-800">{conn.tableCount || '0'}</strong></span>
          {isReferenced && <span>Pipelines: <strong className="text-indigo-600">{conn.pipelineCount}</strong></span>}
        </div>
        {conn.error && <div className="bg-rose-50 text-rose-700 text-xs p-2 rounded-lg mb-3 border border-rose-200">{conn.error}</div>}
        {testResult && (
          <div className={`text-xs p-2 rounded-lg mb-3 border ${testResult.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
            {testResult.success ? `Connected (${testResult.latencyMs}ms) — ${testResult.tableCount} tables found` : `Failed: ${testResult.message}`}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={handleTest} disabled={!canTest || testing}>{testing ? 'Testing...' : (conn.status === 'FAILED' ? CONNECTION.retry : CONNECTION.test)}</Button>
        <Button variant="secondary" size="sm" onClick={() => onEdit(conn)} disabled={!canEdit}>{CONNECTION.edit}</Button>
        {conn.status === 'CONNECTED' && <Button variant="secondary" size="sm" onClick={() => onBrowse(conn)} disabled={!canBrowse}>{CONNECTION.browseSchema}</Button>}
        <Button variant="danger" size="sm" disabled={!canDelete || isReferenced} onClick={() => setConfirmDelete(true)}>{CONNECTION.delete}</Button>
      </div>
      <ConfirmationModal isOpen={confirmDelete && !isReferenced && canDelete} title="Delete Connection" message={`Are you sure you want to delete connection "${conn.name}" permanently?`} color={COLORS.status.error} onClose={() => setConfirmDelete(false)} actions={[{ label: 'Cancel', variant: 'secondary', onClick: () => setConfirmDelete(false) }, { label: 'Yes, delete', variant: 'danger', onClick: handleDelete }]} />
    </div>
  );
};

export default ConnectionCard;
