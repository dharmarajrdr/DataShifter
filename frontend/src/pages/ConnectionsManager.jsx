import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { FRSC, FRBC, FRBS } from '../constants/layouts';
import { CONNECTION } from '../constants/literals';
import { PageHeader, StatusBadge, Button, ApiGuard, Loader } from '../components/common';
import { OracleIcon, PostgresIcon, SpannerIcon } from '../components/layout/Icons';
import ConnectionFormModal from '../components/connections/ConnectionFormModal';
import SchemaDrawer from '../components/connections/SchemaDrawer';
import { connectionApi } from '../services/api';

/* ================================================================
   DB ICON
   ================================================================ */
const DB_ICON_CONFIG = {
  ORACLE: { bg: COLORS.status.errorLight, Icon: OracleIcon },
  SPANNER: { bg: COLORS.status.infoLight, Icon: SpannerIcon },
  POSTGRESQL: { bg: COLORS.status.successLight, Icon: PostgresIcon },
};

const DBIcon = ({ dbType }) => {
  const config = DB_ICON_CONFIG[dbType] || DB_ICON_CONFIG.ORACLE;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: BORDER_RADIUS.md, flexShrink: 0,
      background: config.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <config.Icon />
    </div>
  );
};

/* ================================================================
   DELETE CONFIRM INLINE
   ================================================================ */
const DeleteConfirm = ({ onConfirm, onCancel }) => (
  <div style={{
    ...FRSC, gap: SPACING.xs, padding: `${SPACING.xs} ${SPACING.sm}`,
    background: COLORS.status.errorLight, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.xs,
  }}>
    <span style={{ fontSize: FONT.size.xs, color: COLORS.status.errorText }}>Delete this connection permanently?</span>
    <Button variant="danger" size="sm" onClick={onConfirm}>Yes, delete</Button>
    <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
  </div>
);

/* ================================================================
   CONNECTION CARD
   ================================================================ */
const ConnectionCard = ({ conn, onEdit, onDelete, onUpdate, onTest, onBrowse }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    if (onUpdate) {
      onUpdate(conn.id, { status: 'TESTING' });
    }
    try {
      const res = await connectionApi.test(conn.id);
      setTestResult(res.data);
      if (onUpdate) {
        onUpdate(conn.id, { 
          status: res.data.success ? 'CONNECTED' : 'FAILED',
          error: res.data.success ? null : res.data.message 
        });
      }
    } catch (e) {
      setTestResult({ success: false, message: e.message });
      if (onUpdate) {
        onUpdate(conn.id, { status: 'FAILED', error: e.message });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await connectionApi.delete(conn.id);
      onDelete(conn.id);
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  return (
    <div style={{
      background: COLORS.background.primary, border: `1px solid ${COLORS.border.light}`,
      borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    }}>
      {/* Header */}
      <div style={{ ...FRBS, marginBottom: SPACING.sm }}>
        <div style={{ ...FRSC, gap: '10px' }}>
          <DBIcon dbType={conn.dbType} />
          <div>
            <p style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.medium }}>{conn.name}</p>
            <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px' }}>{conn.host}</p>
          </div>
        </div>
        <StatusBadge status={conn.status} label={CONNECTION.statuses[conn.status]} />
      </div>

      {/* Details */}
      <div style={{ ...FRSC, gap: SPACING.md, fontSize: FONT.size.xs, color: COLORS.text.secondary, marginBottom: SPACING.sm }}>
        <span>Type: <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }}>{conn.type}</span></span>
        <span>Schema: <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }}>{conn.schema}</span></span>
        {conn.tableCount > 0 && (
          <span>Tables: <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }}>{conn.tableCount}</span></span>
        )}
      </div>

      {/* Error */}
      {conn.error && (
        <div style={{
          background: COLORS.status.errorLight, borderRadius: BORDER_RADIUS.md,
          padding: `${SPACING.xs} 10px`, fontSize: FONT.size.xs, color: COLORS.status.errorText,
          marginBottom: SPACING.sm,
        }}>
          {conn.error} Last tested {conn.lastTested ? new Date(conn.lastTested).toLocaleString() : 'never'}.
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div style={{
          background: testResult.success ? COLORS.status.successLight : COLORS.status.errorLight,
          borderRadius: BORDER_RADIUS.md, padding: `${SPACING.xs} 10px`,
          fontSize: FONT.size.xs, marginBottom: SPACING.sm,
          color: testResult.success ? COLORS.status.successText : COLORS.status.errorText,
        }}>
          {testResult.success
            ? `Connected (${testResult.latencyMs}ms) — ${testResult.tableCount} tables found`
            : `Failed: ${testResult.message}`}
        </div>
      )}

      {/* Actions */}
      <div style={{ ...FRSC, gap: '6px' }}>
        <Button variant="secondary" size="sm" onClick={handleTest} style={testing ? { opacity: 0.6 } : {}}>
          {testing ? 'Testing...' : (conn.status === 'FAILED' ? CONNECTION.retry : CONNECTION.test)}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onEdit(conn)}>{CONNECTION.edit}</Button>
        {conn.status === 'CONNECTED' && (
          <Button variant="secondary" size="sm" onClick={() => onBrowse(conn)}>{CONNECTION.browseSchema}</Button>
        )}
        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>{CONNECTION.delete}</Button>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <DeleteConfirm onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
      )}
    </div>
  );
};

/* ================================================================
   MAIN PAGE
   ================================================================ */
const ConnectionsManager = () => {
  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);     // true = new, connection object = edit
  const [editingConn, setEditingConn] = useState(null);
  const [browsingConn, setBrowsingConn] = useState(null);

  const loadConnections = useCallback(() => {
    connectionApi.getAll().then(res => setConnections(res.data || []));
  }, []);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const connectionsRes = await connectionApi.getAll();
        setConnections(connectionsRes.data || []);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadConnections]);

  const handleCreate = async (formData) => {
    await connectionApi.create(formData);
    loadConnections();
  };

  const handleUpdate = async (formData) => {
    await connectionApi.update(editingConn.id, formData);
    loadConnections();
  };

  const handleUpdateStatus = (connId, updates) => {
    setConnections(prev => prev.map(c => c.id === connId ? { ...c, ...updates } : c));
  };

  const handleDelete = (connId) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
  };

  const openEdit = (conn) => { setEditingConn(conn); setShowForm(true); };
  const openNew = () => { setEditingConn(null); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingConn(null); };

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<Loader variant="line" />}>
      <div>
        <PageHeader
          title={CONNECTION.title}
          subtitle={CONNECTION.subtitle}
          actions={<Button onClick={openNew}>{CONNECTION.newConnection}</Button>}
        />

        {connections.length === 0 ? (
          <div style={{
            padding: '60px', textAlign: 'center', color: COLORS.text.secondary,
            border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.lg,
          }}>
            <p style={{ fontSize: FONT.size.lg, marginBottom: SPACING.xs }}>No connections yet</p>
            <p style={{ fontSize: FONT.size.md, marginBottom: SPACING.lg }}>Add your first database connection to get started.</p>
            <Button onClick={openNew}>{CONNECTION.newConnection}</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
            {connections.map(conn => (
              <ConnectionCard 
                key={conn.id} 
                conn={conn} 
                onEdit={openEdit} 
                onDelete={handleDelete} 
                onUpdate={handleUpdateStatus}
                onBrowse={setBrowsingConn} 
              />
            ))}
          </div>
        )}

        {/* New / Edit Modal */}
        {showForm && (
          <ConnectionFormModal
            connection={editingConn}
            onClose={closeForm}
            onSave={editingConn ? handleUpdate : handleCreate}
          />
        )}

        {/* Schema Drawer */}
        {browsingConn && (
          <>
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.15)', zIndex: 999,
            }} onClick={() => setBrowsingConn(null)} />
            <SchemaDrawer
              connectionId={browsingConn.id}
              connectionName={browsingConn.name}
              onClose={() => setBrowsingConn(null)}
            />
          </>
        )}
      </div>
    </ApiGuard>
  );
};

export default ConnectionsManager;