import React from 'react';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';

const inputStyle = {
  width: '100%',
  padding: '6px 10px',
  border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.sm,
  fontSize: FONT.size.sm,
  fontFamily: 'monospace',
  boxSizing: 'border-box',
};

export const PipelineSettingsCdcFields = ({ settings, update, isRunning }) => {
  const isPostgres = settings.cdcLogType === 'POSTGRES_WAL';
  const numStyle = { ...inputStyle, padding: '5px 8px', fontSize: FONT.size.xs, fontFamily: 'inherit' };

  return (
    <>
      <div style={{ marginBottom: SPACING.sm }}>
        <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
          {isPostgres ? 'PostgreSQL WAL Directory Path' : 'Oracle Trail Directory Path'}
        </label>
        <input
          data-testid="settings-cdc-directory"
          value={settings.cdcDirectoryPath || ''}
          onChange={(e) => update('cdcDirectoryPath', e.target.value)}
          placeholder={isPostgres ? 'e.g. /var/lib/postgresql/data/pg_wal' : 'e.g. /u01/app/oracle/dirdat'}
          disabled={isRunning}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm, marginBottom: SPACING.sm }}>
        <div>
          <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>File Pattern</label>
          <input
            data-testid="settings-cdc-pattern"
            value={settings.cdcFilePattern || (isPostgres ? '000000010000.*' : 'aa.*')}
            onChange={(e) => update('cdcFilePattern', e.target.value)}
            placeholder={isPostgres ? '000000010000.*' : 'aa.*'}
            disabled={isRunning}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
            {isPostgres ? 'Starting LSN' : 'Starting SCN'}
          </label>
          <input
            data-testid="settings-cdc-scn"
            value={settings.cdcStartingScn || ''}
            onChange={(e) => update('cdcStartingScn', e.target.value)}
            placeholder={isPostgres ? 'e.g. 0/3D7E5D8 (empty for snapshot)' : 'Leave empty for snapshot SCN'}
            disabled={isRunning}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm, marginBottom: SPACING.md }}>
        <div>
          <label style={{ fontSize: '11px', color: COLORS.text.secondary, display: 'block', marginBottom: '2px' }}>Flush Interval (ms)</label>
          <input
            data-testid="settings-cdc-flush-interval"
            type="number"
            min="50"
            max="10000"
            step="50"
            value={settings.cdcFlushIntervalMs ?? 200}
            onChange={(e) => update('cdcFlushIntervalMs', Number(e.target.value))}
            disabled={isRunning}
            style={numStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: COLORS.text.secondary, display: 'block', marginBottom: '2px' }}>Micro-batch Size (events)</label>
          <input
            data-testid="settings-cdc-batch-size"
            type="number"
            min="10"
            max="10000"
            step="50"
            value={settings.cdcBatchSize ?? 500}
            onChange={(e) => update('cdcBatchSize', Number(e.target.value))}
            disabled={isRunning}
            style={numStyle}
          />
        </div>
      </div>
    </>
  );
};

export default PipelineSettingsCdcFields;
