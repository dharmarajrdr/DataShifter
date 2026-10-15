import React from 'react';
import { FONT, SPACING } from '../../../constants/design';

/**
 * Source table filter pill buttons (<= 100 lines).
 */
export const MappingFilterButtons = ({
  sourceTables = [],
  filters = {},
  onOpenFilter,
}) => (
  <div id="mapping-filter-buttons" style={{ marginTop: SPACING.sm }}>
    {sourceTables.map((st) => {
      const fc = (filters[st.tableName] || []).length;
      return (
        <div
          key={st.tableName}
          id={`filter-btn-${st.tableName}`}
          onClick={() => onOpenFilter({ tableName: st.tableName, columns: st.columns })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: `${SPACING.xs} ${SPACING.sm}`,
            marginRight: SPACING.xs,
            background: fc > 0 ? '#E6F1FB' : '#F7F7F5',
            border: `1px solid ${fc > 0 ? '#85B7EB' : '#E8E8E5'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: FONT.size.xs,
          }}
        >
          <span style={{ fontSize: '14px' }}>+</span>
          <span>Filter: {st.tableName}</span>
          {fc > 0 && (
            <span
              style={{
                background: '#0C447C',
                color: '#fff',
                fontSize: '10px',
                padding: '0 5px',
                borderRadius: '99px',
              }}
            >
              {fc}
            </span>
          )}
        </div>
      );
    })}
  </div>
);

export default MappingFilterButtons;
