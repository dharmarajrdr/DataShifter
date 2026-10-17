import React, { useEffect, useState } from 'react';
import { Button } from '../../common';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { FRBC } from '../../../constants/layouts';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { cdcApi } from '../../../services/api';
import PipelineSettingsResetModal from './PipelineSettingsResetModal';

export const PipelineSettingsCdcCheckpoint = ({ pipelineId, settings, isRunning }) => {
  const { hasPermission } = useAuth();
  const canManageCdc = hasPermission('cdc:manage') || hasPermission('settings:edit');
  const notification = useNotification();
  const [cdcCheckpoint, setCdcCheckpoint] = useState(null);
  const [loadingCheckpoint, setLoadingCheckpoint] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetScn, setResetTargetScn] = useState('');
  const [resettingCheckpoint, setResettingCheckpoint] = useState(false);

  useEffect(() => {
    if (settings.pipelineMode === 'CDC') {
      setLoadingCheckpoint(true);
      cdcApi.getCheckpoint(pipelineId)
        .then((cp) => setCdcCheckpoint(cp.data))
        .catch(() => setCdcCheckpoint(null))
        .finally(() => setLoadingCheckpoint(false));
    }
  }, [pipelineId, settings.pipelineMode]);

  const handleResetCheckpoint = async () => {
    if (!canManageCdc || isRunning || resettingCheckpoint) return;
    setResettingCheckpoint(true);
    try {
      await cdcApi.resetCheckpoint(pipelineId, { targetScn: resetTargetScn ? resetTargetScn.trim() : null });
      setShowResetModal(false);
      setResetTargetScn('');
      notification.success('CDC checkpoint reset successfully');
      cdcApi.getCheckpoint(pipelineId).then((cp) => setCdcCheckpoint(cp.data)).catch(() => {});
    } catch (e) {
      notification.error('Failed to reset checkpoint: ' + (e?.response?.data?.message || e.message));
    } finally {
      setResettingCheckpoint(false);
    }
  };

  const isPostgres = settings.cdcLogType === 'POSTGRES_WAL';

  return (
    <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: SPACING.sm }}>
      <div style={{ ...FRBC, marginBottom: '6px' }}>
        <span style={{ fontSize: FONT.size.xs, fontWeight: 600, color: COLORS.text.primary }}>Active Checkpoint State</span>
        <Button variant="secondary" size="sm" disabled={isRunning || !canManageCdc} onClick={() => setShowResetModal(true)} style={{ fontSize: '11px', padding: '3px 8px' }}>
          Reset Checkpoint
        </Button>
      </div>
      {cdcCheckpoint ? (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: BORDER_RADIUS.sm, padding: '8px 12px', fontSize: '11px', fontFamily: 'monospace' }}>
          <div style={{ ...FRBC, marginBottom: '4px' }}>
            <span style={{ color: COLORS.text.secondary }}>{isPostgres ? 'Last LSN:' : 'Last SCN:'}</span>
            <span style={{ fontWeight: 600, color: '#0F766E' }}>{cdcCheckpoint.lastScn || '—'}</span>
          </div>
          <div style={{ ...FRBC, marginBottom: '4px' }}>
            <span style={{ color: COLORS.text.secondary }}>{isPostgres ? 'Active Segment:' : 'Source File:'}</span>
            <span>{cdcCheckpoint.sourceFile || '—'} (offset {cdcCheckpoint.fileOffset ?? 0})</span>
          </div>
          <div style={{ ...FRBC }}>
            <span style={{ color: COLORS.text.secondary }}>Events Replayed:</span>
            <span>{(cdcCheckpoint.eventsProcessed || 0).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '11px', color: COLORS.text.tertiary, margin: 0 }}>
          {loadingCheckpoint ? 'Loading checkpoint...' : 'No checkpoint recorded yet. Checkpoint will be established upon first stream start.'}
        </p>
      )}
      <PipelineSettingsResetModal
        isOpen={showResetModal}
        cdcLogType={settings.cdcLogType}
        resetTargetScn={resetTargetScn}
        setResetTargetScn={setResetTargetScn}
        resettingCheckpoint={resettingCheckpoint}
        onConfirm={handleResetCheckpoint}
        onClose={() => { setShowResetModal(false); setResetTargetScn(''); }}
      />
    </div>
  );
};

export default PipelineSettingsCdcCheckpoint;
