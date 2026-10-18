import React from 'react';
import { Button, StatusBadge } from '../../common';
import { FRSC } from '../../../constants/layouts';
import { SPACING } from '../../../constants/design';
import { MAPPING as LIT } from '../../../constants/literals';

/**
 * Header action buttons for Column Mapping Board (<= 100 lines).
 */
export const MappingHeaderActions = ({
  status,
  hasChanges,
  canEdit,
  validating,
  saving,
  validateDisabled,
  onValidate,
  onAutoMap,
  onCancel,
  onSave,
}) => (
  <div id="mapping-header-actions" style={{ ...FRSC, gap: SPACING.sm }}>
    {status === 'VALIDATED' && !hasChanges ? (
      <StatusBadge status="VALIDATED" />
    ) : (
      <div style={{ ...FRSC, gap: SPACING.xs }}>
        <Button
          id="btn-validate-mapping"
          variant="primary"
          size="md"
          onClick={onValidate}
          disabled={!canEdit || validating || saving || validateDisabled || hasChanges}
          title={!canEdit ? 'You do not have permission to edit pipelines' : undefined}
        >
          {validating ? 'Validating...' : 'Validate'}
        </Button>
      </div>
    )}
    <Button
      id="btn-auto-map"
      variant="secondary"
      size="md"
      onClick={onAutoMap}
      disabled={!canEdit}
      title={!canEdit ? 'You do not have permission to edit pipelines' : undefined}
    >
      Auto-map
    </Button>
    <Button
      id="btn-cancel-mapping"
      variant="secondary"
      size="md"
      onClick={onCancel}
      disabled={!canEdit || !hasChanges || saving}
      title={!canEdit ? 'You do not have permission to edit pipelines' : undefined}
    >
      Cancel
    </Button>
    <Button
      id="btn-save-mapping"
      size="md"
      onClick={onSave}
      disabled={!canEdit || !hasChanges || saving}
      title={!canEdit ? 'You do not have permission to edit pipelines' : undefined}
    >
      {saving ? 'Saving...' : hasChanges ? 'Save *' : LIT.saveMapping}
    </Button>
  </div>
);

export default MappingHeaderActions;
