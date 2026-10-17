import React from 'react';
import { SETTINGS } from '../../../constants/literals';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../../constants/design';
import { SectionTitle } from './PipelineSettingsCommon';

export const PipelineSettingsGeneralCard = ({ settings, update }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
    <SectionTitle title={SETTINGS.general.title} subtitle={SETTINGS.general.subtitle} />
    <div style={{ marginBottom: SPACING.md }}>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>
        {SETTINGS.general.name}
      </label>
      <input
        value={settings.name || ''}
        onChange={(e) => update('name', e.target.value)}
        style={{
          width: '100%',
          padding: `${SPACING.xs} 10px`,
          border: `1px solid ${COLORS.border.light}`,
          borderRadius: BORDER_RADIUS.md,
          fontSize: FONT.size.md,
          boxSizing: 'border-box',
        }}
      />
    </div>
    <div>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>
        {SETTINGS.general.description}
      </label>
      <input
        value={settings.description || ''}
        onChange={(e) => update('description', e.target.value)}
        style={{
          width: '100%',
          padding: `${SPACING.xs} 10px`,
          border: `1px solid ${COLORS.border.light}`,
          borderRadius: BORDER_RADIUS.md,
          fontSize: FONT.size.md,
          boxSizing: 'border-box',
        }}
      />
    </div>
  </div>
);

export default PipelineSettingsGeneralCard;
