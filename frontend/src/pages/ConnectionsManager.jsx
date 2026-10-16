import React, { useCallback, useEffect, useState } from 'react';
import { ApiGuard, BarLoader, Button, SkeletonLoader } from '../components/common';
import { ConnectionCard, ConnectionsHeader, ConnectionFormModal, SchemaDrawer } from '../components/connections';
import { CONNECTION } from '../constants/literals';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { connectionApi } from '../services/api';
import { ForbiddenPage } from './ErrorPage';

const ConnectionsManager = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('connection:view');
  const canCreate = hasPermission('connection:create');
  const canEdit = hasPermission('connection:edit');
  const canDelete = hasPermission('connection:delete');
  const canTest = hasPermission('connection:test');
  const canBrowse = hasPermission('connection:browse_schema');

  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConn, setEditingConn] = useState(null);
  const [browsingConn, setBrowsingConn] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const notification = useNotification();

  const loadConnections = useCallback(async () => {
    if (!canView) return;
    try {
      const res = await connectionApi.getAll();
      setConnections(res.data || []);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [canView]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleCreate = async (data) => {
    try {
      await connectionApi.create(data);
      notification.success('Connection created successfully');
      loadConnections();
      setShowForm(false);
    } catch (e) { notification.error(e.message || 'Failed to create connection'); }
  };

  const handleUpdate = async (data) => {
    try {
      await connectionApi.update(editingConn.id, data);
      notification.success('Connection updated successfully');
      loadConnections();
      setShowForm(false);
      setEditingConn(null);
    } catch (e) { notification.error(e.message || 'Failed to update connection'); }
  };

  const handleStatus = (id, upd) => setConnections(prev => prev.map(c => c.id === id ? { ...c, ...upd } : c));
  const handleDelete = (id) => setConnections(prev => prev.filter(c => c.id !== id));

  if (!canView) return <ForbiddenPage missingPermission="connection:view" message="You don't have permission to view connections." />;

  const connectedCount = connections.filter(c => c.status === 'CONNECTED').length;

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div><BarLoader /><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"><SkeletonLoader variant="card" count={4} /></div></div>}>
      <div id="connections-manager-page" className="ds-connections-manager-page">
        <ConnectionsHeader totalCount={connections.length} connectedCount={connectedCount} canCreate={canCreate} onNewConnection={() => { setEditingConn(null); setShowForm(true); }} />
        {connections.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-xs">
            <i className="fa-solid fa-network-wired text-3xl text-slate-300 mb-3 block" />
            <p className="text-base font-bold text-slate-800 mb-1">No connections yet</p>
            <p className="text-xs text-slate-500 mb-4">Add your first database or stream connection to get started.</p>
            <Button variant="primary" onClick={() => { setEditingConn(null); setShowForm(true); }} disabled={!canCreate}>{CONNECTION.newConnection}</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map(conn => (
              <ConnectionCard key={conn.id} conn={conn} onEdit={(c) => { setEditingConn(c); setShowForm(true); }} onDelete={handleDelete} onUpdate={handleStatus} onBrowse={setBrowsingConn} canEdit={canEdit} canDelete={canDelete} canTest={canTest} canBrowse={canBrowse} />
            ))}
          </div>
        )}
        {showForm && <ConnectionFormModal connection={editingConn} onClose={() => { setShowForm(false); setEditingConn(null); }} onSave={editingConn ? handleUpdate : handleCreate} />}
        {browsingConn && (
          <>
            <div className="fixed inset-0 bg-slate-900/30 z-[999]" onClick={() => setBrowsingConn(null)} />
            <SchemaDrawer connectionId={browsingConn.id} connectionName={browsingConn.name} onClose={() => setBrowsingConn(null)} />
          </>
        )}
      </div>
    </ApiGuard>
  );
};

export default ConnectionsManager;