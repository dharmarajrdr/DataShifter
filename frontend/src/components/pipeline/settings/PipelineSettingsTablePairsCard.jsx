import React, { useEffect, useState } from 'react';
import { ConfirmationModal } from '../../common';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { FRSC } from '../../../constants/layouts';
import { useNotification } from '../../../contexts/NotificationContext';
import { connectionApi, settingsApi } from '../../../services/api';
import { SectionTitle } from './PipelineSettingsCommon';
import PipelineSettingsAddTableForm from './PipelineSettingsAddTableForm';

export const PipelineSettingsTablePairsCard = ({
  pipelineId,
  settings,
  allTargetMappings,
  updateTableWriteMode,
  fetchSettings,
}) => {
  const notification = useNotification();
  const [sourceTables, setSourceTables] = useState([]);
  const [targetTables, setTargetTables] = useState([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [pairToRemove, setPairToRemove] = useState(null);

  useEffect(() => {
    if (settings?.sourceConnectionId) connectionApi.listTables(settings.sourceConnectionId).then((r) => setSourceTables(r.data || [])).catch(() => {});
    if (settings?.targetConnectionId) connectionApi.listTables(settings.targetConnectionId).then((r) => setTargetTables(r.data || [])).catch(() => {});
  }, [settings?.sourceConnectionId, settings?.targetConnectionId]);

  const confirmRemoveTablePair = async () => {
    if (!pairToRemove) return;
    const { ptId, label } = pairToRemove;
    setPairToRemove(null);
    try {
      await settingsApi.removeTablePair(pipelineId, ptId);
      notification.success(`Table pair "${label}" removed`);
      fetchSettings();
    } catch (e) {
      notification.error('Failed to remove: ' + (e?.response?.data?.message || e.message));
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <SectionTitle title="Table pairs" subtitle="Source and target tables in this pipeline. Add or remove table pairs and configure write modes." />
      <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', background: COLORS.background.primary, marginBottom: SPACING.md }}>
        {allTargetMappings.length === 0 ? (
          <div style={{ padding: SPACING.lg, textAlign: 'center', color: COLORS.text.tertiary, fontSize: FONT.size.sm }}>No table pairs configured.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT.size.sm }}>
            <thead>
              <tr style={{ background: COLORS.background.secondary }}>
                <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>#</th>
                <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Source table</th>
                <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Target table</th>
                <th style={{ textAlign: 'left', padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Write mode</th>
                <th style={{ textAlign: 'right', padding: `${SPACING.xs} ${SPACING.sm}` }}></th>
              </tr>
            </thead>
            <tbody>
              {allTargetMappings.map((row, i) => (
                <tr key={row.ttmId || row.ptId} style={{ borderTop: `1px solid ${COLORS.border.light}` }}>
                  <td style={{ padding: `${SPACING.xs} ${SPACING.sm}`, color: COLORS.text.tertiary }}>{i + 1}</td>
                  <td style={{ padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium }}>{row.sourceTable}</td>
                  <td style={{ padding: `${SPACING.xs} ${SPACING.sm}`, fontWeight: FONT.weight.medium }}>{row.targetTable}</td>
                  <td style={{ padding: `${SPACING.xs} ${SPACING.sm}` }}>
                    <div style={{ ...FRSC, gap: SPACING.xs, flexWrap: 'wrap' }}>
                      <select
                        value={(row.currentMode === 'INSERT_ONLY' || row.currentMode === 'INSERT_IGNORE') ? 'INSERT' : row.currentMode}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateTableWriteMode?.(row.ttmId, val === 'INSERT' ? 'INSERT_IGNORE' : val);
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
                            onChange={(e) => updateTableWriteMode?.(row.ttmId, e.target.value === 'Fail' ? 'INSERT_ONLY' : 'INSERT_IGNORE')}
                            style={{ padding: '4px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, background: '#fff' }}
                          >
                            <option value="Ignore">Ignore</option>
                            <option value="Fail">Fail</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: `${SPACING.xs} ${SPACING.sm}`, textAlign: 'right' }}>
                    <span onClick={() => setPairToRemove({ ptId: row.ptId, label: `${row.sourceTable} → ${row.targetTable}` })} style={{ fontSize: FONT.size.xs, color: '#A32D2D', cursor: 'pointer', fontWeight: 500 }}>Remove</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PipelineSettingsAddTableForm
        pipelineId={pipelineId}
        sourceTables={sourceTables}
        targetTables={targetTables}
        showAddTable={showAddTable}
        setShowAddTable={setShowAddTable}
        fetchSettings={fetchSettings}
      />

      <ConfirmationModal
        isOpen={Boolean(pairToRemove)}
        title="Remove Table Pair"
        message={`Are you sure you want to remove table pair "${pairToRemove?.label}"? Column mappings and transformations for this pair will be permanently deleted.`}
        color={COLORS.status.error}
        onClose={() => setPairToRemove(null)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setPairToRemove(null) },
          { label: 'Yes, remove', variant: 'danger', onClick: confirmRemoveTablePair },
        ]}
      />
    </div>
  );
};

export default PipelineSettingsTablePairsCard;
