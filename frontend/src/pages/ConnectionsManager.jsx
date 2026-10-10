import { useCallback, useEffect, useState } from 'react';
import { ApiGuard, Button, Loader, PageHeader, StatusBadge, ConfirmationModal, BarLoader, SkeletonLoader } from '../components/common';
import ConnectionFormModal from '../components/connections/ConnectionFormModal';
import SchemaDrawer from '../components/connections/SchemaDrawer';
import { OracleIcon, PostgresIcon, SpannerIcon } from '../components/layout/Icons';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../constants/design';
import { FRBS, FRSC } from '../constants/layouts';
import { CONNECTION } from '../constants/literals';
import { connectionApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { ForbiddenPage } from './ErrorPage';

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
   CONNECTION CARD
   ================================================================ */
const ConnectionCard = ({ conn, onEdit, onDelete, onUpdate, onTest, onBrowse, canEdit, canDelete, canTest, canBrowse }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notification = useNotification();

  const isReferenced = (conn.pipelineCount || 0) > 0;

  const handleTest = async () => {
    if (!canTest) return;
    setTesting(true);
    setTestResult(null);
    if (onUpdate) {
      onUpdate(conn.id, { status: 'TESTING' });
    }
    try {
      const res = await connectionApi.test(conn.id);
      setTestResult(res.data);
      if (res.data?.success) {
        notification.success(`Connection to "${conn.name}" tested successfully`);
      } else {
        notification.error(res.data?.message || 'Connection test failed');
      }
      if (onUpdate) {
        onUpdate(conn.id, {
          status: res.data.success ? 'CONNECTED' : 'FAILED',
          error: res.data.success ? null : res.data.message
        });
      }
    } catch (e) {
      setTestResult({ success: false, message: e.message });
      notification.error(e.message || 'Connection test failed');
      if (onUpdate) {
        onUpdate(conn.id, { status: 'FAILED', error: e.message });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      await connectionApi.delete(conn.id);
      notification.success(`Connection "${conn.name}" deleted successfully`);
      onDelete(conn.id);
    } catch (e) {
      console.error('Delete failed:', e);
      notification.error(e.message || 'Failed to delete connection');
    } finally {
      setConfirmDelete(false);
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
        <span>Type: <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }}>{conn.dbType}</span></span>
        <span>Schema: <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }}>{conn.schemaName}</span></span>
        <span>Tables: <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }}>{conn.tableCount || '0'}</span></span>
        {isReferenced && (
          <span>Pipelines: <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }} title={conn.referencedPipelines?.join(', ')}>{conn.pipelineCount}</span></span>
        )}
      </div>

      {/* Error */}
      {(conn.error || deleteError) && (
        <div style={{
          background: COLORS.status.errorLight, borderRadius: BORDER_RADIUS.md,
          padding: `${SPACING.xs} 10px`, fontSize: FONT.size.xs, color: COLORS.status.errorText,
          marginBottom: SPACING.sm,
        }}>
          {deleteError || `${conn.error} Last tested ${conn.lastTested ? new Date(conn.lastTested).toLocaleString() : 'never'}.`}
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
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTest}
          disabled={!canTest || testing}
          title={!canTest ? 'You do not have permission to test connections' : undefined}
          style={testing ? { opacity: 0.6 } : {}}
        >
          {testing ? 'Testing...' : (conn.status === 'FAILED' ? CONNECTION.retry : CONNECTION.test)}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(conn)}
          disabled={!canEdit}
          title={!canEdit ? 'You do not have permission to edit connections' : undefined}
        >
          {CONNECTION.edit}
        </Button>
        {conn.status === 'CONNECTED' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onBrowse(conn)}
            disabled={!canBrowse}
            title={!canBrowse ? 'You do not have permission to browse schema' : undefined}
          >
            {CONNECTION.browseSchema}
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          disabled={!canDelete || isReferenced}
          title={!canDelete
            ? 'You do not have permission to delete connections'
            : (isReferenced
              ? `Cannot delete: referenced by ${conn.referencedPipelines?.length ? conn.referencedPipelines.join(', ') : `${conn.pipelineCount} pipeline(s)`}`
              : undefined)
          }
          onClick={() => setConfirmDelete(true)}
        >
          {CONNECTION.delete}
        </Button>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={confirmDelete && !isReferenced && canDelete}
        title="Delete Connection"
        message={`Are you sure you want to delete connection "${conn.name}" permanently? This cannot be undone.`}
        color={COLORS.status.error}
        onClose={() => setConfirmDelete(false)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setConfirmDelete(false) },
          { label: 'Yes, delete', variant: 'danger', onClick: handleDelete },
        ]}
      />
    </div>
  );
};

/* ================================================================
   MAIN PAGE
   ================================================================ */
const ConnectionsManager = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('connection:view');
  const canCreate = hasPermission('connection:create');
  const canEdit = hasPermission('connection:edit');
  const canDelete = hasPermission('connection:delete');
  const canTest = hasPermission('connection:test');
  const canBrowse = hasPermission('connection:browse_schema');

  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);     // true = new, connection object = edit
  const [editingConn, setEditingConn] = useState(null);
  const [browsingConn, setBrowsingConn] = useState(null);

  const loadConnections = useCallback(() => {
    if (!canView) return;
    connectionApi.getAll().then(res => setConnections(res.data || []));
  }, [canView]);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
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
    };
    load();
  }, [canView]);

  const notification = useNotification();

  const handleCreate = async (formData) => {
    try {
      await connectionApi.create(formData);
      notification.success('Connection created successfully');
      loadConnections();
      closeForm();
    } catch (e) {
      notification.error(e.message || 'Failed to create connection');
    }
  };

  const handleUpdate = async (formData) => {
    try {
      await connectionApi.update(editingConn.id, formData);
      notification.success('Connection updated successfully');
      loadConnections();
      closeForm();
    } catch (e) {
      notification.error(e.message || 'Failed to update connection');
    }
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

  if (!canView) {
    return (
      <ForbiddenPage
        missingPermission="connection:view"
        message="You don't have permission to view connections."
      />
    );
  }

  return (
    <ApiGuard
      error={error}
      loading={loading}
      loadingComponent={
        <div>
          <BarLoader />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: SPACING.md, marginTop: SPACING.lg }}>
            <SkeletonLoader variant="card" count={3} />
          </div>
        </div>
      }
    >
      <div>
        <PageHeader
          title={CONNECTION.title}
          subtitle={CONNECTION.subtitle}
          actions={
            <Button
              onClick={openNew}
              disabled={!canCreate}
              title={!canCreate ? 'You do not have permission to create connections' : undefined}
            >
              {CONNECTION.newConnection}
            </Button>
          }
        />

        {connections.length === 0 ? (
          <div style={{
            padding: '60px', textAlign: 'center', color: COLORS.text.secondary,
            border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.lg,
          }}>
            <p style={{ fontSize: FONT.size.lg, marginBottom: SPACING.xs }}>No connections yet</p>
            <p style={{ fontSize: FONT.size.md, marginBottom: SPACING.lg }}>Add your first database connection to get started.</p>
            <Button
              onClick={openNew}
              disabled={!canCreate}
              title={!canCreate ? 'You do not have permission to create connections' : undefined}
            >
              {CONNECTION.newConnection}
            </Button>
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
                canEdit={canEdit}
                canDelete={canDelete}
                canTest={canTest}
                canBrowse={canBrowse}
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