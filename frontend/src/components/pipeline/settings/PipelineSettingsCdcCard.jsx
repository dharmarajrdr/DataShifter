import React from 'react';
import { SectionTitle } from './PipelineSettingsCommon';
import PipelineSettingsCdcFields from './PipelineSettingsCdcFields';
import PipelineSettingsCdcCheckpoint from './PipelineSettingsCdcCheckpoint';

export const PipelineSettingsCdcCard = ({ pipelineId, settings, update }) => {
  const isCdc = settings?.pipelineMode === 'CDC';
  const isRunning = settings?.status === 'RUNNING';
  const isPostgres = settings?.cdcLogType === 'POSTGRES_WAL';

  if (!isCdc) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <SectionTitle
        title="Execution mode & CDC"
        subtitle="Change Data Capture streaming configuration for real-time replication."
      />

      <div data-testid="settings-cdc-panel" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F766E', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-sliders" /> Change Data Capture Settings
          </p>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#0F766E', background: '#CCFBF1', padding: '2px 8px', borderRadius: '9999px' }}>
            {isPostgres ? 'PostgreSQL WAL' : 'Oracle Trail'}
          </span>
        </div>
        <PipelineSettingsCdcFields settings={settings} update={update} isRunning={isRunning} />
        <PipelineSettingsCdcCheckpoint pipelineId={pipelineId} settings={settings} isRunning={isRunning} />
      </div>
    </div>
  );
};

export default PipelineSettingsCdcCard;
