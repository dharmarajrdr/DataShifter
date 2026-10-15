import React from 'react';
import { FRBC } from '../../../constants/layouts';
import { FONT, SPACING } from '../../../constants/design';

/**
 * Dismissible validation errors and warnings banner (<= 100 lines).
 */
export const MappingValidationErrors = ({ errors = [], onDismiss }) => {
  if (!errors?.length) return null;
  const hasOnlyWarnings = errors.every((e) => typeof e === 'object' && e?.isWarning);
  const bg = hasOnlyWarnings ? '#FEF3C7' : '#FAECE7';
  const border = hasOnlyWarnings ? '#F59E0B' : '#D85A30';
  const textColor = hasOnlyWarnings ? '#854F0B' : '#712B13';
  const title = hasOnlyWarnings ? 'Mapping saved with warnings' : 'Validation errors';

  return (
    <div
      id="mapping-val-errors"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '8px',
        padding: `${SPACING.sm} ${SPACING.md}`,
        marginBottom: SPACING.md,
      }}
    >
      <div style={{ ...FRBC, marginBottom: '6px' }}>
        <span style={{ fontSize: FONT.size.sm, fontWeight: 500, color: textColor }}>{title}</span>
        <span onClick={onDismiss} style={{ cursor: 'pointer', fontSize: FONT.size.xs, color: textColor }}>
          Dismiss
        </span>
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{ fontSize: FONT.size.xs, color: textColor, padding: '2px 0' }}>
          {typeof e === 'object' && e?.isWarning ? (
            <>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }} />
              {e.text}
            </>
          ) : (
            e
          )}
        </div>
      ))}
    </div>
  );
};

export default MappingValidationErrors;
