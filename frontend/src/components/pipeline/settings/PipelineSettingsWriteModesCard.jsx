import React from 'react';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { FRSC } from '../../../constants/layouts';
import { SETTINGS } from '../../../constants/literals';
import { SectionTitle } from './PipelineSettingsCommon';

export const PipelineSettingsWriteModesCard = ({ allTargetMappings, updateTableWriteMode }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
    <SectionTitle title={SETTINGS.perTable.title} subtitle={SETTINGS.perTable.subtitle} />
    {allTargetMappings.length === 0 ? (
      <div style={{ padding: SPACING.lg, textAlign: 'center', color: COLORS.text.tertiary, fontSize: FONT.size.sm, border: `1px dashed ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md }}>
        No table mappings configured yet.
      </div>
    ) : (
      <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', background: COLORS.background.primary }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT.size.sm }}>
          <thead>
            <tr style={{ background: COLORS.background.secondary }}>
              <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Source → Target</th>
              <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Write mode</th>
            </tr>
          </thead>
          <tbody>
            {allTargetMappings.map((row) => (
              <tr key={row.ttmId} style={{ borderTop: `1px solid ${COLORS.border.light}` }}>
                <td style={{ padding: `${SPACING.xs} ${SPACING.sm}` }}>
                  <span style={{ fontWeight: FONT.weight.medium }}>{row.sourceTable}</span>
                  <span style={{ color: COLORS.text.tertiary }}> → </span>
                  <span style={{ fontWeight: FONT.weight.medium }}>{row.targetTable}</span>
                </td>
                <td style={{ padding: `${SPACING.xs} ${SPACING.sm}` }}>
                  <div style={{ ...FRSC, gap: SPACING.xs, flexWrap: 'wrap' }}>
                    <select
                      value={(row.currentMode === 'INSERT_ONLY' || row.currentMode === 'INSERT_IGNORE') ? 'INSERT' : row.currentMode}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateTableWriteMode(row.ttmId, val === 'INSERT' ? 'INSERT_IGNORE' : val);
                      }}
                      style={{ padding: '4px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, background: '#fff' }}
                    >
                      <option value="INSERT">Insert only</option>
                      <option value="UPSERT">Upsert</option>
                      <option value="UPDATE_ONLY">Update only</option>
                    </select>

                    {(row.currentMode === 'INSERT_ONLY' || row.currentMode === 'INSERT_IGNORE') && (
                      <div style={{ ...FRSC, gap: '4px' }}>
                        <label style={{ fontSize: '11px', color: COLORS.text.secondary, whiteSpace: 'nowrap' }}>If PK exists:</label>
                        <select
                          value={row.currentMode === 'INSERT_ONLY' ? 'Fail' : 'Ignore'}
                          onChange={(e) => updateTableWriteMode(row.ttmId, e.target.value === 'Fail' ? 'INSERT_ONLY' : 'INSERT_IGNORE')}
                          style={{ padding: '4px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, background: '#fff' }}
                        >
                          <option value="Ignore">Ignore</option>
                          <option value="Fail">Fail</option>
                        </select>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default PipelineSettingsWriteModesCard;
