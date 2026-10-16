import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiGuard, BarLoader, Button, SkeletonLoader } from '../components/common';
import { ConnectionCard, ConnectionsHeader, ConnectionsKpiGrid, ConnectionsFilterBar, ConnectionFormModal, SchemaDrawer } from '../components/connections';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { connectionApi } from '../services/api';
import { ForbiddenPage } from './ErrorPage';

const CATS = {
  RDBMS: ['POSTGRESQL', 'POSTGRES', 'MYSQL', 'ORACLE', 'SQLSERVER'],
  CLOUD_DW: ['SNOWFLAKE', 'BIGQUERY', 'REDSHIFT', 'SPANNER', 'CLICKHOUSE'],
  STREAMING: ['KAFKA', 'PUBSUB', 'KINESIS', 'RABBITMQ'],
  OBJECT_STORE: ['S3', 'GCS', 'AZUREBLOB'],
};

const ConnectionsManager = () => {
  const { hasPermission } = useAuth();
  const perms = { view: hasPermission('connection:view'), create: hasPermission('connection:create'), edit: hasPermission('connection:edit'), delete: hasPermission('connection:delete'), test: hasPermission('connection:test'), browse: hasPermission('connection:browse_schema') };
  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConn, setEditingConn] = useState(null);
  const [browsingConn, setBrowsingConn] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testingAll, setTestingAll] = useState(false);
  const [category, setCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const notification = useNotification();

  const loadConnections = useCallback(async () => {
    if (!perms.view) return;
    try { const res = await connectionApi.getAll(); setConnections(res.data || []); }
    catch (e) { setError(e); } finally { setLoading(false); }
  }, [perms.view]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const handleTestAll = async () => {
    if (!perms.test || connections.length === 0) return;
    setTestingAll(true);
    let ok = 0;
    for (const c of connections) {
      try { const r = await connectionApi.test(c.id); if (r.data?.success) ok += 1; } catch (e) { /* ignore */ }
    }
    setTestingAll(false);
    notification.info(`Health check: ${ok}/${connections.length} healthy.`);
    loadConnections();
  };

  const categoryCounts = useMemo(() => ({
    ALL: connections.length,
    RDBMS: connections.filter(c => CATS.RDBMS.includes(c.dbType?.toUpperCase())).length,
    CLOUD_DW: connections.filter(c => CATS.CLOUD_DW.includes(c.dbType?.toUpperCase())).length,
    STREAMING: connections.filter(c => CATS.STREAMING.includes(c.dbType?.toUpperCase())).length,
    OBJECT_STORE: connections.filter(c => CATS.OBJECT_STORE.includes(c.dbType?.toUpperCase())).length,
  }), [connections]);

  const filteredConnections = useMemo(() => connections.filter(c => {
    const t = c.dbType?.toUpperCase() || '';
    const matchCat = category === 'ALL' || (CATS[category] && CATS[category].includes(t));
    const q = searchQuery.toLowerCase().trim();
    return matchCat && (!q || c.name?.toLowerCase().includes(q) || c.host?.toLowerCase().includes(q) || t.toLowerCase().includes(q));
  }), [connections, category, searchQuery]);

  if (!perms.view) return <ForbiddenPage missingPermission="connection:view" message="No permission to view connections." />;

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div><BarLoader /><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"><SkeletonLoader variant="card" count={4} /></div></div>}>
      <div id="connections-manager-page" className="ds-connections-manager-page max-w-7xl mx-auto pb-12 flex flex-col gap-6">
        <ConnectionsHeader canCreate={perms.create} onNewConnection={() => { setEditingConn(null); setShowForm(true); }} onTestAll={handleTestAll} testingAll={testingAll} />
        <ConnectionsKpiGrid connections={connections} />
        <ConnectionsFilterBar selectedCategory={category} onCategoryChange={setCategory} searchQuery={searchQuery} onSearchChange={setSearchQuery} categoryCounts={categoryCounts} />
        {filteredConnections.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-xs">
            <i className="fa-solid fa-network-wired text-3xl text-slate-300 mb-3 block" />
            <p className="text-base font-bold text-slate-800 mb-1">No matching connections</p>
            <p className="text-xs text-slate-500 mb-4">Try clearing filters or create a new database connection.</p>
            <Button variant="primary" onClick={() => { setEditingConn(null); setShowForm(true); }} disabled={!perms.create}>Add Connection</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnections.map(conn => (
              <ConnectionCard key={conn.id} conn={conn} onEdit={(c) => { setEditingConn(c); setShowForm(true); }} onDelete={(id) => setConnections(p => p.filter(c => c.id !== id))} onUpdate={(id, u) => setConnections(p => p.map(c => c.id === id ? { ...c, ...u } : c))} onBrowse={setBrowsingConn} canEdit={perms.edit} canDelete={perms.delete} canTest={perms.test} canBrowse={perms.browse} />
            ))}
          </div>
        )}
        {showForm && <ConnectionFormModal connection={editingConn} onClose={() => { setShowForm(false); setEditingConn(null); }} onSave={async (d) => { if (editingConn) await connectionApi.update(editingConn.id, d); else await connectionApi.create(d); notification.success(`Connection saved`); loadConnections(); setShowForm(false); setEditingConn(null); }} />}
        {browsingConn && (<><div className="fixed inset-0 bg-slate-900/30 z-[999]" onClick={() => setBrowsingConn(null)} /><SchemaDrawer connectionId={browsingConn.id} connectionName={browsingConn.name} onClose={() => setBrowsingConn(null)} /></>)}
      </div>
    </ApiGuard>
  );
};

export default ConnectionsManager;