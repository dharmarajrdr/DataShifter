import React from 'react';
import { FONT, SPACING } from '../../../constants/design';
import { FRSC } from '../../../constants/layouts';

/**
 * Top statistics and status strip for Column Mapping board (<= 100 lines).
 */
export const MappingStatsBar = ({
  sourceTablesCount = 0,
  targetTablesCount = 0,
  mappingsCount = 0,
  unmappedReq = 0,
  totalFilters = 0,
  hasChanges = false,
}) => (
  <div
    id="mapping-stats-bar"
    style={{
      ...FRSC,
      gap: SPACING.sm,
      marginBottom: SPACING.xs,
      padding: `${SPACING.xs} ${SPACING.md}`,
      background: '#F7F7F5',
      borderRadius: '8px',
      fontSize: FONT.size.xs,
    }}
  >
    <span style={{ color: '#6B6B6B' }}>
      {sourceTablesCount} source → {targetTablesCount} target
    </span>
    <span style={{ color: '#D4D4D0' }}>|</span>
    <span style={{ color: '#534AB7', fontWeight: 500 }}>{mappingsCount} mapped</span>
    {unmappedReq > 0 && (
      <>
        <span style={{ color: '#D4D4D0' }}>|</span>
        <span style={{ color: '#854F0B', fontWeight: 500 }}>{unmappedReq} required unmapped</span>
      </>
    )}
    {totalFilters > 0 && (
      <>
        <span style={{ color: '#D4D4D0' }}>|</span>
        <span style={{ color: '#0C447C', fontWeight: 500 }}>
          {totalFilters} filter{totalFilters !== 1 ? 's' : ''}
        </span>
      </>
    )}
    {hasChanges && (
      <>
        <span style={{ color: '#D4D4D0' }}>|</span>
        <span style={{ color: '#A32D2D' }}>Unsaved</span>
      </>
    )}
  </div>
);

export default MappingStatsBar;
