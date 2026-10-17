import React from 'react';
import { SectionTitle } from './PipelineSettingsCommon';
import PipelineSettingsCdcModeSelector from './PipelineSettingsCdcModeSelector';
import PipelineSettingsCdcLogTypeSelector from './PipelineSettingsCdcLogTypeSelector';
import PipelineSettingsCdcFields from './PipelineSettingsCdcFields';
import PipelineSettingsCdcCheckpoint from './PipelineSettingsCdcCheckpoint';

export const PipelineSettingsCdcCard = ({ pipelineId, settings, update }) => {
  const isCdc = settings.pipelineMode === 'CDC';
  const isRunning = settings.status === 'RUNNING';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <SectionTitle
        title="Execution mode & CDC"
        subtitle="Configure whether this pipeline operates in batch mode or real-time CDC streaming mode."
      />
      <PipelineSettingsCdcModeSelector settings={settings} update={update} isRunning={isRunning} />

      {isCdc && (
        <div data-testid="settings-cdc-panel" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F766E', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-sliders" /> Change Data Capture Settings
          </p>
          <PipelineSettingsCdcLogTypeSelector settings={settings} update={update} isRunning={isRunning} />
          <PipelineSettingsCdcFields settings={settings} update={update} isRunning={isRunning} />
          <PipelineSettingsCdcCheckpoint pipelineId={pipelineId} settings={settings} isRunning={isRunning} />
        </div>
      )}
    </div>
  );
};

export default PipelineSettingsCdcCard;
