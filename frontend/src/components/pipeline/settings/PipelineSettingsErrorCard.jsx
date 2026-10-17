import React from 'react';
import { Toggle } from '../../common';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { SETTINGS } from '../../../constants/literals';
import { SectionTitle, SettingRow } from './PipelineSettingsCommon';

export const PipelineSettingsErrorCard = ({ settings, update }) => (
  <>
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <SectionTitle title={SETTINGS.errorHandling.title} subtitle={SETTINGS.errorHandling.subtitle} />
      <SettingRow label={SETTINGS.errorHandling.ignoreExceptions} description={SETTINGS.errorHandling.ignoreExceptionsDesc}>
        <Toggle checked={Boolean(settings.ignoreExceptions)} onChange={(v) => update('ignoreExceptions', v)} />
      </SettingRow>
      <SettingRow label={SETTINGS.errorHandling.maxThreshold} description={SETTINGS.errorHandling.maxThresholdDesc}>
        <input
          type="number"
          value={settings.maxErrorThreshold ?? 0}
          onChange={(e) => update('maxErrorThreshold', Number(e.target.value))}
          style={{ width: '80px', padding: `${SPACING.xxs} ${SPACING.xs}`, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.sm, textAlign: 'right', fontFamily: 'monospace' }}
        />
      </SettingRow>
      <SettingRow label={SETTINGS.errorHandling.logSourceRow} description={SETTINGS.errorHandling.logSourceRowDesc}>
        <Toggle checked={Boolean(settings.logSourceRow)} onChange={(v) => update('logSourceRow', v)} />
      </SettingRow>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <SectionTitle title="Data privacy" subtitle="Control whether migrated data is visible in the Live Monitor." />
      <SettingRow label="Preview in-flight records" description="When enabled, the Live Monitor shows a real-time preview of records being migrated. Disable for confidential data.">
        <Toggle checked={settings.previewInflightRecords !== false} onChange={(v) => update('previewInflightRecords', v)} />
      </SettingRow>
    </div>
  </>
);

export default PipelineSettingsErrorCard;
