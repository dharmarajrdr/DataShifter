import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { FRBC } from '../../../constants/layouts';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { pipelineApi } from '../../../services/api';
import { Button, ConfirmationModal } from '../../common';
import { SectionTitle } from './PipelineSettingsCommon';

export const PipelineSettingsDangerCard = ({ pipelineId, settings }) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canDeletePipeline = hasPermission('pipeline:delete');
  const notification = useNotification();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isRunning = settings.status === 'RUNNING';

  const confirmDeletePipeline = async () => {
    if (!canDeletePipeline || isRunning || deleting) return;
    setDeleting(true);
    try {
      await pipelineApi.delete(pipelineId);
      setShowDeleteConfirm(false);
      notification.success(`Pipeline "${settings.name}" deleted`);
      navigate('/pipelines');
    } catch (e) {
      notification.error('Failed to delete pipeline: ' + (e?.response?.data?.message || e.message));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-rose-200 rounded-xl p-6 shadow-xs mb-6">
      <SectionTitle title="Danger zone" subtitle="Irreversible and destructive actions for this pipeline." />
      <div style={{ ...FRBC, padding: `${SPACING.sm} ${SPACING.md}`, background: COLORS.status.errorLight, border: `1px solid ${COLORS.status.error}`, borderRadius: BORDER_RADIUS.md }}>
        <div>
          <p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, color: COLORS.status.errorDark, margin: 0 }}>Delete pipeline</p>
          <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px', margin: 0 }}>
            {settings.workflowId ? (
              <>
                This pipeline is linked to workflow{' '}
                <span onClick={() => navigate(`/workflows/${settings.workflowId}/edit`)} style={{ color: COLORS.brand.primary, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  {settings.workflowName || 'Workflow'}
                </span>{' '}
                and cannot be deleted. Remove it from the workflow first.
              </>
            ) : isRunning ? (
              'Pause or stop the pipeline before deleting it.'
            ) : (
              'Permanently delete this pipeline, its table mappings, transformations, and execution history.'
            )}
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          disabled={!canDeletePipeline || isRunning || deleting || Boolean(settings.workflowId)}
          title={
            settings.workflowId ? `Cannot delete pipeline while linked to workflow '${settings.workflowName}'` : !canDeletePipeline ? 'You do not have permission to delete pipelines' : isRunning ? 'Cannot delete a running pipeline' : 'Delete this pipeline'
          }
          onClick={() => setShowDeleteConfirm(true)}
        >
          {deleting ? 'Deleting...' : 'Delete Pipeline'}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Pipeline"
        message={`Are you sure you want to delete pipeline "${settings.name}"? This cannot be undone.`}
        color={COLORS.status.error}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteConfirm(false) },
          { label: deleting ? 'Deleting...' : 'Yes, delete', variant: 'danger', onClick: confirmDeletePipeline },
        ]}
      />
    </div>
  );
};

export default PipelineSettingsDangerCard;
