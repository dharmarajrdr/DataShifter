import React, { useState } from 'react';
import { Button } from '../../common';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { FRSC } from '../../../constants/layouts';
import { useNotification } from '../../../contexts/NotificationContext';
import { settingsApi } from '../../../services/api';

const selectStyle = {
  padding: '7px 10px',
  border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md,
  fontSize: FONT.size.sm,
  background: '#fff',
  flex: 1,
};

export const PipelineSettingsAddTableForm = ({
  pipelineId,
  sourceTables,
  targetTables,
  showAddTable,
  setShowAddTable,
  fetchSettings,
}) => {
  const notification = useNotification();
  const [newSourceTable, setNewSourceTable] = useState('');
  const [newTargetTable, setNewTargetTable] = useState('');
  const [addingTable, setAddingTable] = useState(false);

  if (!showAddTable) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setShowAddTable(true)}>
        + Add table pair
      </Button>
    );
  }

  const handleAdd = async () => {
    if (!newSourceTable || !newTargetTable) return;
    setAddingTable(true);
    try {
      await settingsApi.addTablePair(pipelineId, newSourceTable, newTargetTable);
      setNewSourceTable('');
      setNewTargetTable('');
      setShowAddTable(false);
      notification.success('Table pair added successfully');
      fetchSettings();
    } catch (e) {
      notification.error('Failed to add: ' + (e?.response?.data?.message || e.message));
    } finally {
      setAddingTable(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${COLORS.brand.primary}`, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, background: COLORS.accent.purpleLight }}>
      <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: SPACING.sm }}>Add table pair</p>
      <div style={{ ...FRSC, gap: SPACING.sm, marginBottom: SPACING.sm }}>
        <select value={newSourceTable} onChange={(e) => setNewSourceTable(e.target.value)} style={selectStyle}>
          <option value="">Select source table</option>
          {sourceTables.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ color: COLORS.text.tertiary, fontSize: FONT.size.sm }}>→</span>
        <select value={newTargetTable} onChange={(e) => setNewTargetTable(e.target.value)} style={selectStyle}>
          <option value="">Select target table</option>
          {targetTables.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ ...FRSC, gap: SPACING.xs }}>
        <Button onClick={handleAdd} disabled={!newSourceTable || !newTargetTable || addingTable}>
          {addingTable ? 'Adding...' : 'Add'}
        </Button>
        <Button variant="secondary" onClick={() => { setShowAddTable(false); setNewSourceTable(''); setNewTargetTable(''); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default PipelineSettingsAddTableForm;
