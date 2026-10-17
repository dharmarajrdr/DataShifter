import React from 'react';
import { COLORS, FONT, SPACING } from '../../../constants/design';
import { FRSC } from '../../../constants/layouts';
import { SETTINGS } from '../../../constants/literals';
import { SectionTitle } from './PipelineSettingsCommon';

export const PipelineSettingsProcessingCard = ({ settings, update }) => (
  <>
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <SectionTitle title={SETTINGS.processing.title} subtitle={SETTINGS.processing.subtitle} />
      <div style={{ marginBottom: SPACING.md }}>
        <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>
          {SETTINGS.processing.chunkSize}
        </label>
        <div style={{ ...FRSC, gap: SPACING.sm }}>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={settings.chunkSize || 10000}
            onChange={(e) => update('chunkSize', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, fontFamily: 'monospace', minWidth: '70px', textAlign: 'right' }}>
            {(settings.chunkSize || 10000).toLocaleString()}
          </span>
        </div>
        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xxs, margin: 0 }}>
          {SETTINGS.processing.chunkHint}
        </p>
      </div>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <SectionTitle
        title="Connection pool"
        subtitle="Number of database connections to establish. Higher = more throughput, but uses more DB resources."
      />
      <div style={{ marginBottom: SPACING.md }}>
        <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>
          Source DB connections
        </label>
        <div style={{ ...FRSC, gap: SPACING.sm }}>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={settings.sourcePoolSize || 5}
            onChange={(e) => update('sourcePoolSize', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, fontFamily: 'monospace', minWidth: '30px', textAlign: 'right' }}>
            {settings.sourcePoolSize || 5}
          </span>
        </div>
        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xxs, margin: 0 }}>
          Connections for reading source data. Default: 5.
        </p>
      </div>
      <div>
        <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>
          Target DB connections
        </label>
        <div style={{ ...FRSC, gap: SPACING.sm }}>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={settings.targetPoolSize || 10}
            onChange={(e) => update('targetPoolSize', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, fontFamily: 'monospace', minWidth: '30px', textAlign: 'right' }}>
            {settings.targetPoolSize || 10}
          </span>
        </div>
        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xxs, margin: 0 }}>
          Connections for writing target data. Default: 10.
        </p>
      </div>
    </div>
  </>
);

export default PipelineSettingsProcessingCard;
