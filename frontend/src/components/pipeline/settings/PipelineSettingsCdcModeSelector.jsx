import React from 'react';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { FRBC } from '../../../constants/layouts';

export const PipelineSettingsCdcModeSelector = ({ settings, update, isRunning }) => {
  const isCdc = settings.pipelineMode === 'CDC';

  return (
    <div style={{ marginBottom: SPACING.md }}>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xs }}>
        Execution mode
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
        <div
          data-testid="settings-mode-batch"
          onClick={() => !isRunning && update('pipelineMode', 'BATCH')}
          style={{
            padding: SPACING.sm,
            borderRadius: BORDER_RADIUS.md,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            border: !isCdc ? `2px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`,
            background: !isCdc ? COLORS.accent.purpleLight : COLORS.background.primary,
            opacity: isRunning ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ ...FRBC, marginBottom: '2px' }}>
            <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-layer-group" style={{ color: !isCdc ? COLORS.brand.primary : COLORS.text.secondary }} />
              Batch Migration
            </span>
            {!isCdc && <span style={{ fontSize: '10px', color: COLORS.brand.primary, fontWeight: 600 }}>Active</span>}
          </div>
          <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>Full table snapshot migration</p>
        </div>

        <div
          data-testid="settings-mode-cdc"
          onClick={() => !isRunning && update('pipelineMode', 'CDC')}
          style={{
            padding: SPACING.sm,
            borderRadius: BORDER_RADIUS.md,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            border: isCdc ? '2px solid #0D9488' : `1px solid ${COLORS.border.light}`,
            background: isCdc ? '#F0FDFA' : COLORS.background.primary,
            opacity: isRunning ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ ...FRBC, marginBottom: '2px' }}>
            <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-bolt" style={{ color: isCdc ? '#0D9488' : COLORS.text.secondary }} />
              CDC Streaming
            </span>
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#0D9488', background: '#CCFBF1', padding: '1px 5px', borderRadius: BORDER_RADIUS.pill }}>Real-time</span>
          </div>
          <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>Continuous trail/WAL capture</p>
        </div>
      </div>
    </div>
  );
};

export default PipelineSettingsCdcModeSelector;
