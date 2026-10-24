import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Loader, PageHeader } from '../components/common';
import { COLORS, FONT, SPACING } from '../constants/design';
import { FRSC } from '../constants/layouts';
import { SETTINGS } from '../constants/literals';
import { ForbiddenPage, ServerErrorPage } from './ErrorPage';
import { usePipelineSettings } from '../components/pipeline/settings/usePipelineSettings';
import PipelineSettingsGeneralCard from '../components/pipeline/settings/PipelineSettingsGeneralCard';
import PipelineSettingsCdcCard from '../components/pipeline/settings/PipelineSettingsCdcCard';
import PipelineSettingsTablePairsCard from '../components/pipeline/settings/PipelineSettingsTablePairsCard';
import PipelineSettingsProcessingCard from '../components/pipeline/settings/PipelineSettingsProcessingCard';
import PipelineSettingsErrorCard from '../components/pipeline/settings/PipelineSettingsErrorCard';
import PipelineSettingsDangerCard from '../components/pipeline/settings/PipelineSettingsDangerCard';

export const PipelineSettings = () => {
  const navigate = useNavigate();
  const {
    pipelineId, settings, saving, hasChanges, allTargetMappings,
    canViewPipeline, canEditSettings, accessDenied, deniedPermission,
    loading, error,
    update, updateTableWriteMode, handleSave, fetchSettings,
  } = usePipelineSettings();

  if (!canViewPipeline) {
    return <ForbiddenPage missingPermission="pipeline:view" message="You don't have permission to view pipelines." />;
  }

  if (!canEditSettings || accessDenied) {
    return <ForbiddenPage missingPermission={deniedPermission || 'pipeline:settings'} message="You don't have permission to edit pipeline settings." />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-8">
        <Loader message="Loading pipeline settings..." />
      </div>
    );
  }

  if (error) {
    return <ServerErrorPage message={error} onRetry={fetchSettings} />;
  }

  if (!settings) {
    return <ForbiddenPage missingPermission="pipeline:settings" message="You don't have permission to edit pipeline settings." />;
  }

  const isRunning = settings.status === 'RUNNING';

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: settings.name, onClick: () => navigate(`/pipelines/${pipelineId}/monitor`) }, { label: SETTINGS.title }]}
        actions={
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            {hasChanges && !isRunning && <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>Unsaved changes</span>}
            {isRunning && <span style={{ fontSize: FONT.size.xs, color: COLORS.status.warning }}>Pipeline is running</span>}
            <Button onClick={handleSave} disabled={saving || !hasChanges || isRunning}>
              {saving ? 'Saving...' : SETTINGS.save}
            </Button>
          </div>
        }
        headerStyles={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm }}
      />

      <div style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
        <div style={{ maxWidth: '65%', paddingBottom: '3rem' }}>
          <PipelineSettingsGeneralCard settings={settings} update={update} />
          <PipelineSettingsCdcCard pipelineId={pipelineId} settings={settings} update={update} />
          <PipelineSettingsTablePairsCard
            pipelineId={pipelineId}
            settings={settings}
            allTargetMappings={allTargetMappings}
            updateTableWriteMode={updateTableWriteMode}
            fetchSettings={fetchSettings}
          />
          <PipelineSettingsProcessingCard settings={settings} update={update} />
          <PipelineSettingsErrorCard settings={settings} update={update} />
          <PipelineSettingsDangerCard pipelineId={pipelineId} settings={settings} />
        </div>
      </div>
    </div>
  );
};

export default PipelineSettings;
