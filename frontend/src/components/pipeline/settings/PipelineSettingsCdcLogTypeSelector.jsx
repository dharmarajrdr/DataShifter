import React from 'react';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';

export const PipelineSettingsCdcLogTypeSelector = ({ settings, update, isRunning }) => {
  const isPostgres = settings.cdcLogType === 'POSTGRES_WAL';

  return (
    <div style={{ marginBottom: SPACING.sm }}>
      <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
        CDC Log Format
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
        <div
          data-testid="settings-logtype-oracle-trail"
          onClick={() => !isRunning && update('cdcLogType', 'ORACLE_TRAIL')}
          style={{
            padding: '6px 10px',
            borderRadius: BORDER_RADIUS.sm,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            border: !isPostgres ? '2px solid #0D9488' : `1px solid ${COLORS.border.light}`,
            background: !isPostgres ? '#fff' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isRunning ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <i className="fa-solid fa-database" style={{ fontSize: '12px', color: !isPostgres ? '#0D9488' : COLORS.text.secondary }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text.primary }}>Oracle Trail</div>
            <div style={{ fontSize: '9px', color: COLORS.text.secondary }}>GoldenGate SCN</div>
          </div>
        </div>

        <div
          data-testid="settings-logtype-postgres-wal"
          onClick={() => !isRunning && update('cdcLogType', 'POSTGRES_WAL')}
          style={{
            padding: '6px 10px',
            borderRadius: BORDER_RADIUS.sm,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            border: isPostgres ? '2px solid #0D9488' : `1px solid ${COLORS.border.light}`,
            background: isPostgres ? '#fff' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isRunning ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <i className="fa-solid fa-file-waveform" style={{ fontSize: '12px', color: isPostgres ? '#0D9488' : COLORS.text.secondary }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text.primary }}>PostgreSQL WAL</div>
            <div style={{ fontSize: '9px', color: COLORS.text.secondary }}>Write-Ahead Log LSN</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineSettingsCdcLogTypeSelector;
