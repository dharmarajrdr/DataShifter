import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DragBoardToolbar, MappingHeaderActions, MappingStatsBar, MappingValidationErrors } from './index';
import { checkTargetCompatibility, normalizeDataType, validateInputForType } from '../../../utils/typeValidation';
import { simulateOne } from '../../../utils/transformSimulator';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Column Mapping Board Components and Utilities', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
  });

  test('DragBoardToolbar renders zoom and action buttons', () => {
    act(() => {
      root.render(<DragBoardToolbar id="test-tb" zoom={1} onZoomIn={() => {}} onZoomOut={() => {}} onResetView={() => {}} onOrganize={() => {}} />);
    });
    expect(container.querySelector('#test-tb-zoom-level').textContent).toBe('100%');
    expect(container.querySelector('#test-tb-organize')).not.toBeNull();
  });

  test('MappingStatsBar displays counts and status', () => {
    act(() => {
      root.render(<MappingStatsBar sourceTablesCount={2} targetTablesCount={2} mappingsCount={5} unmappedReq={1} hasChanges={true} />);
    });
    expect(container.textContent).toContain('2 source → 2 target');
    expect(container.textContent).toContain('5 mapped');
    expect(container.textContent).toContain('1 required unmapped');
    expect(container.textContent).toContain('Unsaved');
  });

  test('MappingValidationErrors displays error list and dismiss', () => {
    act(() => {
      root.render(<MappingValidationErrors errors={['Column id missing']} onDismiss={() => {}} />);
    });
    expect(container.textContent).toContain('Validation errors');
    expect(container.textContent).toContain('Column id missing');
  });

  test('MappingHeaderActions renders Cancel button and handles click', () => {
    const handleCancel = jest.fn();
    act(() => {
      root.render(<MappingHeaderActions status="DRAFT" hasChanges={true} canEdit={true} onCancel={handleCancel} onSave={() => {}} onAutoMap={() => {}} onValidate={() => {}} />);
    });
    const cancelBtn = container.querySelector('#btn-cancel-mapping');
    expect(cancelBtn).not.toBeNull();
    expect(cancelBtn.disabled).toBe(false);
    expect(cancelBtn.textContent).toContain('Cancel');
    act(() => { cancelBtn.click(); });
    expect(handleCancel).toHaveBeenCalled();
  });

  test('MappingHeaderActions disables Cancel button when hasChanges is false', () => {
    act(() => {
      root.render(<MappingHeaderActions status="DRAFT" hasChanges={false} canEdit={true} onCancel={() => {}} onSave={() => {}} onAutoMap={() => {}} onValidate={() => {}} />);
    });
    const cancelBtn = container.querySelector('#btn-cancel-mapping');
    expect(cancelBtn.disabled).toBe(true);
    expect(container.querySelector('#btn-clear-all')).toBeNull();
  });

  test('normalizeDataType normalizes common SQL types', () => {
    expect(normalizeDataType('VARCHAR(255)')).toBe('STRING');
    expect(normalizeDataType('BIGINT')).toBe('NUMBER');
    expect(normalizeDataType('TIMESTAMP WITH TIME ZONE')).toBe('DATE');
    expect(normalizeDataType('BOOLEAN')).toBe('BOOLEAN');
    expect(normalizeDataType('JSONB')).toBe('JSON');
  });

  test('validateInputForType checks type constraints', () => {
    expect(validateInputForType('123', 'NUMBER').ok).toBe(true);
    expect(validateInputForType('abc', 'NUMBER').ok).toBe(false);
    expect(validateInputForType('true', 'BOOLEAN').ok).toBe(true);
  });

  test('checkTargetCompatibility checks type matching', () => {
    expect(checkTargetCompatibility('STRING', 'STRING').ok).toBe(true);
    expect(checkTargetCompatibility('NUMBER', 'STRING').ok).toBe(true);
    expect(checkTargetCompatibility('STRING', 'NUMBER').ok).toBe(false);
  });

  test('simulateOne evaluates transformations correctly', () => {
    expect(simulateOne('  hello  ', 'TRIM').val).toBe('hello');
    expect(simulateOne('hello', 'UPPER').val).toBe('HELLO');
    expect(simulateOne('12.3456', 'ROUND', '2').val).toBe(12.35);
  });
});
