import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ConfirmationModal, PageHeader } from '../components/common';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../constants/design';
import { FRBC, FRSC } from '../constants/layouts';
import { SETTINGS } from '../constants/literals';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { namespaceApi, workflowApi } from '../services/api';
import { ForbiddenPage } from './ErrorPage';

const SectionTitle = ({ title, subtitle }) => (
  <div style={{ marginBottom: SPACING.md }}>
    <p style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.medium }}>{title}</p>
    <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '2px' }}>{subtitle}</p>
  </div>
);

const Divider = () => (
  <div style={{ height: '1px', background: COLORS.border.light, margin: `${SPACING.xl} 0` }} />
);

const WorkflowSettings = () => {
  const { hasPermission } = useAuth();
  const canViewWorkflow = hasPermission('workflow:view');
  const canEditWorkflow = hasPermission('workflow:edit');
  const canDeleteWorkflow = hasPermission('workflow:delete');

  const [accessDenied, setAccessDenied] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { workflowId } = useParams();
  const navigate = useNavigate();
  const notification = useNotification();

  const fetchSettings = useCallback(() => {
    if (!canViewWorkflow) return;
    Promise.all([
      workflowApi.getById(workflowId),
      namespaceApi.getAll().catch(() => ({ data: [] })),
    ])
      .then(([wfRes, nsRes]) => {
        setWorkflow({
          ...wfRes.data,
          name: wfRes.data?.name || '',
          description: wfRes.data?.description || '',
          namespaceId: wfRes.data?.namespaceId || '',
        });
        setNamespaces(nsRes.data || []);
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          setAccessDenied(true);
        }
      });
  }, [workflowId, canViewWorkflow]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (!canViewWorkflow) {
    return (
      <ForbiddenPage
        missingPermission="workflow:view"
        message="You don't have permission to view workflows."
      />
    );
  }

  if (accessDenied || (!canEditWorkflow && !canDeleteWorkflow)) {
    return (
      <ForbiddenPage
        missingPermission="workflow:edit"
        message="You don't have permission to manage workflow settings."
      />
    );
  }

  if (!workflow) return null;

  const isRunningOrPaused = workflow.status === 'RUNNING' || workflow.status === 'PAUSED';

  const update = (key, value) => {
    setWorkflow((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (isRunningOrPaused) {
      notification.warning('Pause or stop the workflow before updating settings');
      return;
    }
    if (!hasChanges || saving || !canEditWorkflow) return;
    if (!workflow.name.trim()) {
      notification.warning('Workflow name is required');
      return;
    }
    setSaving(true);
    try {
      await workflowApi.update(workflowId, {
        name: workflow.name.trim(),
        description: workflow.description || '',
        namespaceId: workflow.namespaceId || '',
      });
      setHasChanges(false);
      notification.success('Workflow settings saved successfully');
    } catch (e) {
      notification.error(
        'Save failed: ' + (e?.response?.data?.message || e.message || 'Unknown error')
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteWorkflow = async () => {
    if (!canDeleteWorkflow || isRunningOrPaused || deleting) return;
    setDeleting(true);
    try {
      await workflowApi.delete(workflowId);
      setShowDeleteConfirm(false);
      notification.success(`Workflow "${workflow.name}" deleted`);
      navigate('/workflows');
    } catch (e) {
      notification.error(
        'Failed to delete workflow: ' + (e?.response?.data?.message || e.message)
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: workflow.name || 'Workflow', onClick: () => navigate(`/workflows/${workflowId}/monitor`) },
          { label: SETTINGS.title },
        ]}
        actions={
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            {hasChanges && !isRunningOrPaused && (
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                Unsaved changes
              </span>
            )}
            {isRunningOrPaused && (
              <span style={{ fontSize: FONT.size.xs, color: COLORS.status.warning }}>
                Workflow is {workflow.status.toLowerCase()}
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges || isRunningOrPaused || !canEditWorkflow}
            >
              {saving ? 'Saving...' : SETTINGS.save}
            </Button>
          </div>
        }
        headerStyles={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: SPACING.sm,
        }}
      />

      <div style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
        <div style={{ maxWidth: '55%' }}>
          {/* ============================================================ */}
          {/* GENERAL */}
          {/* ============================================================ */}
          <SectionTitle
            title={SETTINGS.general.title}
            subtitle="Configure workflow name, description, and namespace."
          />
          <div style={{ marginBottom: SPACING.md }}>
            <label
              style={{
                fontSize: FONT.size.sm,
                color: COLORS.text.secondary,
                display: 'block',
                marginBottom: SPACING.xxs,
              }}
            >
              Workflow name
            </label>
            <input
              value={workflow.name}
              disabled={!canEditWorkflow || isRunningOrPaused}
              onChange={(e) => update('name', e.target.value)}
              style={{
                width: '100%',
                padding: `${SPACING.xs} 10px`,
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.md,
                fontSize: FONT.size.md,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: SPACING.md }}>
            <label
              style={{
                fontSize: FONT.size.sm,
                color: COLORS.text.secondary,
                display: 'block',
                marginBottom: SPACING.xxs,
              }}
            >
              {SETTINGS.general.description}
            </label>
            <input
              value={workflow.description}
              disabled={!canEditWorkflow || isRunningOrPaused}
              onChange={(e) => update('description', e.target.value)}
              style={{
                width: '100%',
                padding: `${SPACING.xs} 10px`,
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.md,
                fontSize: FONT.size.md,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: SPACING.md }}>
            <label
              style={{
                fontSize: FONT.size.sm,
                color: COLORS.text.secondary,
                display: 'block',
                marginBottom: SPACING.xxs,
              }}
            >
              Namespace
            </label>
            <select
              value={workflow.namespaceId || ''}
              disabled={!canEditWorkflow || isRunningOrPaused}
              onChange={(e) => update('namespaceId', e.target.value)}
              style={{
                width: '100%',
                padding: `${SPACING.xs} 10px`,
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.md,
                fontSize: FONT.size.md,
                background: '#fff',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Default</option>
              {namespaces.map((ns) => (
                <option key={ns.id} value={ns.id}>
                  {ns.name}
                </option>
              ))}
            </select>
          </div>

          <Divider />

          {/* ============================================================ */}
          {/* DANGER ZONE */}
          {/* ============================================================ */}
          <SectionTitle
            title="Danger zone"
            subtitle="Irreversible and destructive actions for this workflow."
          />
          <div
            style={{
              ...FRBC,
              padding: `${SPACING.sm} ${SPACING.md}`,
              background: COLORS.status.errorLight,
              border: `1px solid ${COLORS.status.error}`,
              borderRadius: BORDER_RADIUS.md,
              marginBottom: SPACING.xl,
              gap: SPACING.md,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: FONT.size.md,
                  fontWeight: FONT.weight.medium,
                  color: COLORS.status.errorDark,
                }}
              >
                Delete workflow
              </p>
              <p
                style={{
                  fontSize: FONT.size.xs,
                  color: COLORS.text.secondary,
                  marginTop: '2px',
                }}
              >
                {isRunningOrPaused
                  ? 'Stop the workflow before deleting it.'
                  : 'Permanently delete this workflow. All pipelines inside this workflow will be unlocked for standalone execution, and the pipelines themselves will NOT be deleted.'}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              disabled={!canDeleteWorkflow || isRunningOrPaused || deleting}
              title={
                !canDeleteWorkflow
                  ? 'You do not have permission to delete workflows'
                  : isRunningOrPaused
                    ? 'Cannot delete a running or paused workflow'
                    : 'Delete this workflow'
              }
              onClick={() => setShowDeleteConfirm(true)}
            >
              {deleting ? 'Deleting...' : 'Delete Workflow'}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete workflow confirmation modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Workflow"
        message={`Are you sure you want to delete workflow "${workflow.name}"? All pipelines inside this workflow will be unlocked for standalone execution, and the pipelines themselves will NOT be deleted.`}
        color={COLORS.status.error}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteConfirm(false) },
          {
            label: deleting ? 'Deleting...' : 'Yes, delete',
            variant: 'danger',
            onClick: confirmDeleteWorkflow,
          },
        ]}
      />
    </div>
  );
};

export default WorkflowSettings;
