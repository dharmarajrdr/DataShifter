import React from 'react';
import { Button } from '../../common';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { FRBC } from '../../../constants/layouts';

export const PipelineSettingsResetModal = ({
  isOpen,
  cdcLogType,
  resetTargetScn,
  setResetTargetScn,
  resettingCheckpoint,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const isPostgres = cdcLogType === 'POSTGRES_WAL';

  return (
    <div
      data-testid="cdc-reset-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.xl,
          width: '420px',
          maxWidth: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xs, color: COLORS.text.primary }}>
          Reset CDC Checkpoint
        </h3>
        <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.md, lineHeight: 1.4 }}>
          Rewind or reset the change tracking checkpoint. On the next execution, the stream reader will resume from the specified {isPostgres ? 'LSN' : 'SCN'}, or restart from the beginning if left blank.
        </p>

        <div style={{ marginBottom: SPACING.lg }}>
          <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
            {isPostgres ? 'Target LSN / Position (Optional)' : 'Target SCN / Position (Optional)'}
          </label>
          <input
            data-testid="input-reset-target-scn"
            value={resetTargetScn}
            onChange={(e) => setResetTargetScn(e.target.value)}
            placeholder="Leave blank to rewind to start"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.sm,
              fontSize: FONT.size.sm,
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: '11px', color: COLORS.text.tertiary, marginTop: '4px', display: 'block' }}>
            {isPostgres
              ? 'Enter an LSN (e.g. 0/3D7E5D8) or leave empty to clear the checkpoint.'
              : 'Enter an SCN (e.g. 24589000) or leave empty to clear the checkpoint.'}
          </span>
        </div>

        <div style={{ ...FRBC }}>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={resettingCheckpoint}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} disabled={resettingCheckpoint}>
            {resettingCheckpoint ? 'Resetting...' : 'Confirm Reset'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PipelineSettingsResetModal;
