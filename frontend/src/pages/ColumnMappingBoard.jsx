import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiGuard, Button, Loader, PageHeader } from '../components/common';
import { CloseIcon } from '../components/layout/Icons';
import DragMappingBoard from '../components/pipeline/DragMappingBoard';
import UdfPickerModal from '../components/pipeline/UdfPickerModal';
import { FONT, SPACING } from '../constants/design';
import { FRBC, FREC, FRSC, FRWSC } from '../constants/layouts';
import { MAPPING as LIT } from '../constants/literals';
import { mappingApi } from '../services/api';

const COLOR_KEYS = ['purple', 'teal', 'coral', 'pink', 'blue'];

/* ================================================================
   TRANSFORM FUNCTION METADATA
   ================================================================ */
const FN_META = {
  TRIM: { desc: 'Remove leading/trailing whitespace', needsArgs: false, category: 'Text' },
  UPPER: { desc: 'Convert to UPPERCASE', needsArgs: false, category: 'Text' },
  LOWER: { desc: 'Convert to lowercase', needsArgs: false, category: 'Text' },
  APPEND: { desc: 'Append suffix to value', needsArgs: true, argHint: "'_suffix'", category: 'Text' },
  PREPEND: { desc: 'Prepend prefix to value', needsArgs: true, argHint: "'PREFIX_'", category: 'Text' },
  CONCAT: { desc: 'Append suffix (alias for APPEND)', needsArgs: true, argHint: "'_suffix'", category: 'Text' },
  CONCAT_COLUMNS: { desc: 'Concat multiple columns', needsArgs: 'split', argHint: ['Separator', 'Column names (comma-sep)'], category: 'Text' },
  SUBSTRING: { desc: 'Extract substring by index', needsArgs: 'split', argHint: ['Start index (required)', 'End index (required)'], category: 'Text' },
  TO_STRING: { desc: 'Convert to string', needsArgs: false, category: 'Type' },
  TO_DATE: { desc: 'Parse string to date', needsArgs: true, argHint: "yyyy-MM-dd", category: 'Type' },
  TO_NUMBER: { desc: 'Parse string to number', needsArgs: false, category: 'Type' },
  TO_BOOLEAN: { desc: 'Parse to boolean (true/false, 1/0, yes/no)', needsArgs: false, category: 'Type' },
  DEFAULT_IF_NULL: { desc: 'Replace null with default (only when source is null)', needsArgs: true, argHint: "default value", category: 'Null' },
  TO_JSON: { desc: 'Build JSON object field', needsArgs: true, argHint: 'field name', category: 'JSON' },
  TO_JSON_ARRAY: { desc: 'Build JSON array', needsArgs: true, argHint: 'wrapper key (optional)', category: 'JSON' },
  CURRENT_TIMESTAMP: { desc: 'Current system timestamp', needsArgs: false, category: 'System', isSystemValue: true },
  CURRENT_DATE: { desc: 'Current date (no time)', needsArgs: false, category: 'System', isSystemValue: true },
  STATIC_VALUE: { desc: 'Fixed constant for every row', needsArgs: true, argHint: 'value (e.g., STANDARD)', category: 'System', isSystemValue: true },
  UUID: { desc: 'Generate UUID v4', needsArgs: false, category: 'System', isSystemValue: true },
  ROW_NUMBER: { desc: 'Sequential counter (1, 2, 3...)', needsArgs: false, category: 'System', isSystemValue: true },
  UDF: { desc: 'Custom Java row UDF', needsArgs: 'udf', category: 'Custom' },
};

const ALL_FUNCTIONS = ['TRIM', 'UPPER', 'LOWER', 'APPEND', 'PREPEND', 'CONCAT', 'CONCAT_COLUMNS', 'SUBSTRING', 'TO_STRING', 'TO_DATE', 'TO_NUMBER', 'TO_BOOLEAN', 'DEFAULT_IF_NULL', 'TO_JSON', 'TO_JSON_ARRAY'];

/* ================================================================
   TRANSFORM SIMULATION (for preview)
   ================================================================ */
const simulateOne = (value, fn, args) => {
  // System value generators — ignore input, produce their own value
  switch (fn) {
    case 'CURRENT_TIMESTAMP': return { ok: true, val: new Date().toISOString().replace('T', ' ').slice(0, 19) };
    case 'CURRENT_DATE': return { ok: true, val: new Date().toISOString().split('T')[0] };
    case 'UUID': return { ok: true, val: 'xxxxxxxx-xxxx-4xxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)) + '-...' };
    case 'ROW_NUMBER': return { ok: true, val: Math.floor(Math.random() * 100) + 1 };
    case 'STATIC_VALUE': return args ? { ok: true, val: args } : { ok: false, val: null, err: 'Value required' };
    case 'UDF': {
      try {
        const u = typeof args === 'string' ? JSON.parse(args) : (args || {});
        return { ok: true, val: `[${u.methodName || 'UDF'}(${value ?? 'row'})]` };
      } catch {
        return { ok: true, val: `[UDF(${value ?? 'row'})]` };
      }
    }
    default: break;
  }
  if (value === null || value === undefined) {
    if (fn === 'DEFAULT_IF_NULL') return { ok: true, val: args || '' };
    return { ok: true, val: null };
  }
  const s = String(value);
  switch (fn) {
    case 'TRIM': return { ok: true, val: s.trim() };
    case 'UPPER': return { ok: true, val: s.toUpperCase() };
    case 'LOWER': return { ok: true, val: s.toLowerCase() };
    case 'APPEND':
    case 'CONCAT': return args ? { ok: true, val: s + args } : { ok: false, val: s, err: 'No suffix provided' };
    case 'PREPEND': return args ? { ok: true, val: args + s } : { ok: false, val: s, err: 'No prefix provided' };
    case 'CONCAT_COLUMNS': return args ? { ok: true, val: s + (args.includes('|') ? args.split('|')[0] : ' ') + '<col_values>' } : { ok: false, val: s, err: 'Specify separator|col1,col2' };
    case 'SUBSTRING': {
      const parts = (args || '').split(',').map(p => parseInt(p.trim(), 10));
      if (isNaN(parts[0])) return { ok: false, val: s, err: 'Invalid start index' };
      const start = parts[0], end = isNaN(parts[1]) ? s.length : parts[1];
      if (start < 0 || start > s.length) return { ok: false, val: s, err: `Start ${start} out of range (0-${s.length})` };
      if (end < start) return { ok: false, val: s, err: `End ${end} < start ${start}` };
      return { ok: true, val: s.substring(start, end) };
    }
    case 'TO_STRING': return { ok: true, val: s };
    case 'TO_NUMBER': { const n = Number(s.trim()); return isNaN(n) ? { ok: false, val: s, err: `"${s.trim()}" is not a number` } : { ok: true, val: n }; }
    case 'TO_BOOLEAN': { const low = s.trim().toLowerCase(); const truthy = ['true', 'yes', '1', 'y', 't', 'on']; const falsy = ['false', 'no', '0', 'n', 'f', 'off']; if (truthy.includes(low)) return { ok: true, val: true }; if (falsy.includes(low)) return { ok: true, val: false }; return { ok: false, val: s, err: `"${s}" is not a boolean` }; }
    case 'TO_DATE': { const d = new Date(s.trim()); return isNaN(d.getTime()) ? { ok: false, val: s, err: `"${s.trim()}" is not a valid date` } : { ok: true, val: d.toISOString().split('T')[0] }; }
    case 'DEFAULT_IF_NULL': return { ok: true, val: s };
    case 'TO_JSON': return args ? { ok: true, val: `{"${args}": "${s}"}` } : { ok: false, val: s, err: 'No field name' };
    case 'TO_JSON_ARRAY': return { ok: true, val: args ? `{"${args}": ["${s}"]}` : `["${s}"]` };
    default: return { ok: true, val: s };
  }
};

const simulateChain = (sourceValue, steps) => {
  let current = sourceValue;
  const results = [];
  for (const step of steps) {
    const r = simulateOne(current, step.fn, step.args);
    results.push(r);
    if (!r.ok) break;
    current = r.val;
  }
  return results;
};

const getSampleData = (dataType) => {
  const t = (dataType || '').toUpperCase();
  if (t.includes('INT') || t.includes('NUMBER') || t.includes('NUMERIC') || t.includes('DECIMAL') || t.includes('FLOAT') || t.includes('DOUBLE'))
    return ['42', '0', '-17', '3.14', null];
  if (t.includes('DATE') || t.includes('TIME') || t.includes('TIMESTAMP'))
    return ['2024-03-15', '2023-12-01', 'not-a-date', '2025-01-01 14:30:00', null];
  if (t.includes('BOOL'))
    return ['true', 'false', '1', '0', null];
  return ['  Hello World  ', 'john.doe@email.com', '', '  UPPERCASE  ', null];
};

/* ================================================================
   TRANSFORM SLIDE-OVER PANEL
   ================================================================ */
const TransformPanel = ({ mapping, mappingIdx, sourceTables = [], onApply, onClose }) => {
  const isSystemValue = mapping?.targetOnly;

  const [steps, setSteps] = useState((mapping?.transforms || []).map((t, i) => ({
    id: `s${i}`, fn: t.fn, args: t.args || '', start: '', end: '',
    ...(t.fn === 'SUBSTRING' && t.args ? (() => { const p = t.args.split(','); return { start: p[0] || '', end: p[1] || '' }; })() : {}),
    isSystemStep: i === 0 && !!FN_META[t.fn]?.isSystemValue,
  })));

  const [udfModalOpen, setUdfModalOpen] = useState(false);
  const [editingUdfStepId, setEditingUdfStepId] = useState(null);

  const handleOpenUdfModal = (stepId = null) => {
    setEditingUdfStepId(stepId);
    setUdfModalOpen(true);
  };

  const handleApplyUdfConfig = (config) => {
    const configStr = JSON.stringify(config);
    if (editingUdfStepId) {
      setSteps(prev => prev.map(s => s.id === editingUdfStepId ? { ...s, args: configStr } : s));
    } else {
      setSteps(prev => [...prev, { id: `s${Date.now()}`, fn: 'UDF', args: configStr, start: '', end: '', isSystemStep: false }]);
    }
    setEditingUdfStepId(null);
  };

  // For system values, use null as starting sample. For regular mappings, use type-based samples.
  const srcType = mapping?.source?.split('.')?.[1] || '';
  const sampleData = useMemo(() => {
    if (isSystemValue) return [null, null, null]; // system values ignore input
    return getSampleData(mapping?.sourceType || srcType);
  }, [mapping?.sourceType, srcType, isSystemValue]);

  const addStep = (fn) => {
    setSteps(prev => [...prev, { id: `s${Date.now()}`, fn, args: '', start: '', end: '', isSystemStep: false }]);
  };
  const removeStep = (id) => setSteps(prev => {
    const step = prev.find(s => s.id === id);
    if (step?.isSystemStep) return prev; // Cannot remove system value step
    return prev.filter(s => s.id !== id);
  });

  const updateArgs = (id, args) => setSteps(prev => prev.map(s => s.id === id ? { ...s, args } : s));
  const updateSubstr = (id, field, val) => {
    setSteps(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: val };
      updated.args = `${updated.start || '0'},${updated.end || ''}`;
      return updated;
    }));
  };

  // Build effective steps for simulation
  const effectiveSteps = steps.map(s => ({ fn: s.fn, args: s.fn === 'SUBSTRING' ? `${s.start || '0'},${s.end || ''}` : s.args }));

  // Validate each step — returns array of { stepId, error } for invalid steps
  const stepErrors = useMemo(() => {
    const errors = [];
    steps.forEach(s => {
      const meta = FN_META[s.fn] || {};
      if (s.fn === 'UDF' && (!s.args || !s.args.trim())) {
        errors.push({ id: s.id, error: 'UDF configuration is required' });
      }
      if (meta.needsArgs === true && (!s.args || !s.args.trim())) {
        errors.push({ id: s.id, error: `${s.fn} requires a value` });
      }
      if (meta.needsArgs === 'split') {
        if (s.fn === 'SUBSTRING') {
          const start = s.start?.trim(), end = s.end?.trim();
          if (!start) errors.push({ id: s.id, error: 'Start index is required' });
          else if (isNaN(Number(start))) errors.push({ id: s.id, error: 'Start must be a number' });
          else if (Number(start) < 0) errors.push({ id: s.id, error: 'Start must be ≥ 0' });
          if (!end) errors.push({ id: s.id, error: 'End index is required' });
          else if (isNaN(Number(end))) errors.push({ id: s.id, error: 'End must be a number' });
          if (start && end && !isNaN(Number(start)) && !isNaN(Number(end)) && Number(end) < Number(start)) errors.push({ id: s.id, error: 'End must be ≥ start' });
        }
        if (s.fn === 'CONCAT_COLUMNS') {
          const parts = (s.args || '').split('|');
          if (parts.length < 2 || !parts[1]?.trim()) errors.push({ id: s.id, error: 'Specify separator|column_names' });
        }
      }
      if (s.fn === 'TO_JSON' && (!s.args || !s.args.trim())) errors.push({ id: s.id, error: 'Field name required' });
      if (s.fn === 'STATIC_VALUE' && (!s.args || !s.args.trim())) errors.push({ id: s.id, error: 'Value is required' });
    });
    return errors;
  }, [steps]);

  const hasValidationErrors = stepErrors.length > 0;
  const getStepError = (id) => stepErrors.find(e => e.id === id)?.error;

  // Also check preview — if any sample fails, show warning (but don't block Apply)
  const previewHasErrors = useMemo(() => {
    return sampleData.some(val => {
      const chain = simulateChain(val, effectiveSteps);
      return chain.some(r => !r.ok);
    });
  }, [sampleData, effectiveSteps]);

  const canApply = !hasValidationErrors && !previewHasErrors;

  const handleApply = () => {
    if (!canApply) return;
    onApply(mappingIdx, effectiveSteps.map(s => ({ fn: s.fn, args: s.args })));
    onClose();
  };

  // Group functions by category — exclude System category from the "add" list
  const categories = {};
  ALL_FUNCTIONS.forEach(fn => {
    const cat = FN_META[fn]?.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(fn);
  });

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#fff', borderLeft: '1px solid #E8E8E5', boxShadow: '-4px 0 16px rgba(0,0,0,.06)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, borderBottom: '1px solid #E8E8E5', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium }}>
            {isSystemValue ? 'System value + Transformation' : 'Transformation'}
          </p>
          <p style={{ fontSize: FONT.size.xs, color: '#6B6B6B', marginTop: '2px' }}>
            {isSystemValue ? `⚙ ${mapping?.target}` : `${mapping?.source} → ${mapping?.target}`}
          </p>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer' }}><CloseIcon /></span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: SPACING.lg }}>
        {/* Function chain */}
        <p style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: '#6B6B6B', marginBottom: SPACING.xs }}>Function chain</p>
        {steps.length === 0 ? (
          <div style={{ border: '1px dashed #D4D4D0', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#9B9B9B', fontSize: FONT.size.xs, marginBottom: SPACING.md }}>No functions. Click below to add.</div>
        ) : (
          <div style={{ border: '1px solid #E8E8E5', borderRadius: '8px', overflow: 'hidden', marginBottom: SPACING.md }}>
            {steps.map((step, i) => {
              const meta = FN_META[step.fn] || {};
              const isLocked = step.isSystemStep;
              const stepErr = getStepError(step.id);
              const clr = isLocked
                ? { bg: '#FEF3C7', text: '#854F0B' }
                : [{ bg: '#EEEDFE', text: '#3C3489' }, { bg: '#E1F5EE', text: '#085041' }, { bg: '#FAECE7', text: '#712B13' }][(isLocked ? 0 : i) % 3];
              const inputBorder = stepErr ? '1px solid #D85A30' : '1px solid #E8E8E5';
              return (
                <div key={step.id}>
                  {i > 0 && <div style={{ padding: '1px 0 1px 32px', fontSize: '10px', color: '#9B9B9B' }}>↓ then</div>}
                  <div style={{ display: 'flex', alignItems: 'center', padding: `8px ${SPACING.sm}`, background: isLocked ? '#FFFBEB' : '#F7F7F5', gap: '6px' }}>
                    <span style={{ background: clr.bg, color: clr.text, fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 500, flexShrink: 0 }}>
                      {isLocked ? '⚙' : i + 1}
                    </span>
                    <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, fontFamily: 'monospace', flexShrink: 0 }}>{step.fn}</span>
                    {step.fn === 'UDF' ? (() => {
                      let parsed = {};
                      try { parsed = typeof step.args === 'string' ? JSON.parse(step.args) : (step.args || {}); } catch { }
                      return (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                          <span style={{ fontSize: FONT.size.xs, fontWeight: 600, color: '#3C3489', fontFamily: 'monospace' }}>
                            {parsed.methodName}(Row row)
                          </span>
                          {parsed.inputColumns?.length > 0 && (
                            <span style={{ fontSize: '10px', color: '#6B6B6B', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              in: [{parsed.inputColumns.join(',')}]
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenUdfModal(step.id)}
                            style={{ marginLeft: 'auto', background: '#fff', border: '1px solid #D4D4D0', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer', color: '#534AB7', fontWeight: 500, flexShrink: 0 }}
                          >
                            Edit
                          </button>
                        </div>
                      );
                    })() : meta.needsArgs === 'split' ? (
                      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                        <input value={step.start} onChange={e => updateSubstr(step.id, 'start', e.target.value)} placeholder="Start" type="number" min="0"
                          style={{ width: '60px', padding: '2px 6px', border: inputBorder, borderRadius: '4px', fontSize: FONT.size.xs, fontFamily: 'monospace' }} />
                        <input value={step.end} onChange={e => updateSubstr(step.id, 'end', e.target.value)} placeholder="End" type="number" min="0"
                          style={{ width: '60px', padding: '2px 6px', border: inputBorder, borderRadius: '4px', fontSize: FONT.size.xs, fontFamily: 'monospace' }} />
                      </div>
                    ) : meta.needsArgs ? (
                      <input value={step.args} onChange={e => updateArgs(step.id, e.target.value)} placeholder={meta.argHint}
                        disabled={isLocked && !meta.needsArgs}
                        style={{ flex: 1, padding: '2px 6px', border: inputBorder, borderRadius: '4px', fontSize: FONT.size.xs, fontFamily: 'monospace', minWidth: 0 }} />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#9B9B9B' }}>{meta.desc}</span>
                    )}
                    {isLocked ? (
                      <span style={{ fontSize: '8px', color: '#D97706', flexShrink: 0 }} title="System value cannot be removed here. Use Remove on the board.">🔒</span>
                    ) : (
                      <span onClick={() => removeStep(step.id)} style={{ cursor: 'pointer', flexShrink: 0 }}><CloseIcon color="#9B9B9B" size={10} /></span>
                    )}
                  </div>
                  {stepErr && <div style={{ padding: '2px 8px 4px 36px', fontSize: '10px', color: '#A32D2D' }}>⚠ {stepErr}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* Info for system values */}
        {isSystemValue && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '8px', padding: '8px 12px', marginBottom: SPACING.md, fontSize: FONT.size.xs, color: '#854F0B' }}>
            The system value generates data automatically. You can add additional transforms below to modify the generated value. To remove the system value entirely, use the <b>Remove</b> button on the mapping board.
          </div>
        )}

        {/* Custom Java UDF Callout */}
        <div style={{ marginBottom: SPACING.md, background: '#F4F2FF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CECBF6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: FONT.size.xs, fontWeight: 600, color: '#3C3489', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Custom Java UDF</span>
            </div>
            <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '1px' }}>
              Execute custom row-level Java transformations
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenUdfModal(null)}
            style={{ background: '#534AB7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: FONT.size.xs, fontWeight: 500, cursor: 'pointer' }}
          >
            + Add Java UDF
          </button>
        </div>

        {/* Available functions grouped — system values not shown here */}
        <p style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: '#6B6B6B', marginBottom: SPACING.xs }}>Add transformation</p>
        {Object.entries(categories).map(([cat, fns]) => (
          <div key={cat} style={{ marginBottom: SPACING.sm }}>
            <p style={{ fontSize: '10px', color: '#9B9B9B', marginBottom: '4px' }}>{cat}</p>
            <div style={{ ...FRWSC, gap: '4px' }}>
              {fns.map(fn => (
                <div key={fn} onClick={() => addStep(fn)} title={FN_META[fn]?.desc}
                  style={{ background: '#F7F7F5', border: '1px solid #E8E8E5', padding: '3px 8px', borderRadius: '6px', fontSize: FONT.size.xs, fontFamily: 'monospace', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EEEDFE'; e.currentTarget.style.borderColor = '#534AB7'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F7F7F5'; e.currentTarget.style.borderColor = '#E8E8E5'; }}>
                  <span style={{ fontSize: '10px' }}>+</span><span>{fn}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Live preview */}
        <p style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: '#6B6B6B', marginBottom: SPACING.xs, marginTop: SPACING.md }}>Preview</p>
        <div style={{ border: '1px solid #E8E8E5', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead><tr style={{ background: '#F7F7F5' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: '#6B6B6B' }}>{isSystemValue ? 'Row' : 'Input'}</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: '#6B6B6B' }}>Output</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: '#6B6B6B', width: '30%' }}>Status</th>
            </tr></thead>
            <tbody style={{ fontFamily: 'monospace' }}>
              {sampleData.map((val, i) => {
                const chain = simulateChain(val, effectiveSteps);
                const last = chain.length > 0 ? chain[chain.length - 1] : { ok: true, val: val };
                const hasErr = chain.some(r => !r.ok);
                const errMsg = chain.find(r => !r.ok)?.err;
                const finalVal = hasErr ? (chain.find(r => !r.ok)?.val ?? val) : (last?.val ?? val);
                return (
                  <tr key={i} style={{ borderTop: '1px solid #E8E8E5' }}>
                    <td style={{ padding: '5px 8px', color: '#6B6B6B' }}>
                      {isSystemValue ? `Row ${i + 1}` : val === null ? <em style={{ color: '#9B9B9B' }}>null</em> : `"${val}"`}
                    </td>
                    <td style={{ padding: '5px 8px', color: hasErr ? '#A32D2D' : '#1A1A1A', fontWeight: 500 }}>
                      {finalVal === null ? <em style={{ color: '#9B9B9B' }}>null</em> : steps.length === 0 ? <em style={{ color: '#9B9B9B' }}>—</em> : `"${finalVal}"`}
                    </td>
                    <td style={{ padding: '5px 8px', fontSize: '10px' }}>
                      {steps.length === 0 ? <span style={{ color: '#9B9B9B' }}>No transforms</span> : hasErr ? (
                        <span style={{ color: '#A32D2D' }}>⚠ {errMsg}</span>
                      ) : (
                        <span style={{ color: '#0F6E56' }}>✓ OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ ...FREC, gap: SPACING.xs, padding: `${SPACING.sm} ${SPACING.lg}`, borderTop: '1px solid #E8E8E5', flexShrink: 0 }}>
        {hasValidationErrors && <span style={{ fontSize: '10px', color: '#A32D2D', flex: 1 }}>Fix {stepErrors.length} error{stepErrors.length > 1 ? 's' : ''} to apply</span>}
        {previewHasErrors && !hasValidationErrors && <span style={{ fontSize: '10px', color: '#D97706', flex: 1 }}>⚠ Some preview rows show errors</span>}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} style={!canApply ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>Apply</Button>
      </div>

      {/* Embedded UDF Picker Modal */}
      {udfModalOpen && (
        <UdfPickerModal
          targetColumn={mapping?.target?.split('.')?.[1] || mapping?.target || ''}
          sourceTables={sourceTables}
          initialConfig={(() => {
            if (editingUdfStepId) {
              const st = steps.find(s => s.id === editingUdfStepId);
              try { return JSON.parse(st?.args || '{}'); } catch { return null; }
            }
            return null;
          })()}
          onApply={handleApplyUdfConfig}
          onClose={() => { setUdfModalOpen(false); setEditingUdfStepId(null); }}
        />
      )}
    </div>
  );
};

/* ================================================================
   FILTER OPERATORS
   ================================================================ */
const FILTER_OPS = [
  { value: 'EQUALS', label: '=', desc: 'Equal to', needsValue: true },
  { value: 'NOT_EQUALS', label: '≠', desc: 'Not equal to', needsValue: true },
  { value: 'GREATER_THAN', label: '>', desc: 'Greater than', needsValue: true },
  { value: 'LESS_THAN', label: '<', desc: 'Less than', needsValue: true },
  { value: 'GREATER_THAN_OR_EQUAL', label: '≥', desc: 'Greater or equal', needsValue: true },
  { value: 'LESS_THAN_OR_EQUAL', label: '≤', desc: 'Less or equal', needsValue: true },
  { value: 'IN', label: 'IN', desc: 'In list (comma-separated)', needsValue: true, hint: 'USD,INR,EUR' },
  { value: 'NOT_IN', label: 'NOT IN', desc: 'Not in list', needsValue: true, hint: 'USD,INR,EUR' },
  { value: 'LIKE', label: 'LIKE', desc: 'Pattern match (% wildcard)', needsValue: true, hint: '%pattern%' },
  { value: 'IS_NULL', label: 'IS NULL', desc: 'Is null', needsValue: false },
  { value: 'NOT_NULL', label: 'NOT NULL', desc: 'Is not null', needsValue: false },
];

/* ================================================================
   FILTER SLIDE-OVER PANEL
   ================================================================ */
const FilterPanel = ({ sourceTable, sourceColumns, existingFilters, onApply, onClose }) => {
  const [filters, setFilters] = useState(
    (existingFilters || []).map((f, i) => ({ id: `f${i}`, column: f.columnName, operator: f.operator, value: f.value || '', logical: f.logicalOperator || 'AND' }))
  );

  const addFilter = () => setFilters(prev => [...prev, { id: `f${Date.now()}`, column: sourceColumns[0]?.name || '', operator: 'EQUALS', value: '', logical: 'AND' }]);
  const removeFilter = (id) => setFilters(prev => prev.filter(f => f.id !== id));
  const updateFilter = (id, field, val) => setFilters(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));

  const handleApply = () => {
    const valid = filters.filter(f => f.column && f.operator);
    onApply(sourceTable, valid.map((f, i) => ({
      columnName: f.column, operator: f.operator, value: f.value,
      logicalOperator: i < valid.length - 1 ? f.logical : null, filterOrder: i,
    })));
    onClose();
  };

  // Build human-readable preview
  const previewSQL = filters.length === 0 ? 'No filters — all rows will be migrated' :
    'WHERE ' + filters.map((f, i) => {
      const op = FILTER_OPS.find(o => o.value === f.operator);
      const valPart = op?.needsValue === false ? '' : f.operator === 'IN' || f.operator === 'NOT_IN' ? ` (${f.value})` : ` '${f.value}'`;
      return `${i > 0 ? ` ${f.logical} ` : ''}${f.column} ${op?.label || f.operator}${valPart}`;
    }).join('');

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#fff', borderLeft: '1px solid #E8E8E5', boxShadow: '-4px 0 16px rgba(0,0,0,.06)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, borderBottom: '1px solid #E8E8E5', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium }}>Source filter</p>
          <p style={{ fontSize: FONT.size.xs, color: '#6B6B6B', marginTop: '2px' }}>{sourceTable} — only matching rows will be migrated</p>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer' }}><CloseIcon /></span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: SPACING.lg }}>
        {/* Filter rules */}
        {filters.length === 0 ? (
          <div style={{ border: '1px dashed #D4D4D0', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#9B9B9B', fontSize: FONT.size.xs, marginBottom: SPACING.md }}>
            No filters. All rows from <strong>{sourceTable}</strong> will be migrated.
          </div>
        ) : (
          <div style={{ marginBottom: SPACING.md }}>
            {filters.map((f, i) => {
              const opMeta = FILTER_OPS.find(o => o.value === f.operator);
              return (
                <div key={f.id} style={{ marginBottom: SPACING.xs }}>
                  {i > 0 && (
                    <div style={{ ...FRSC, gap: '6px', marginBottom: '4px', padding: '0 4px' }}>
                      <select value={f.logical} onChange={e => updateFilter(f.id, 'logical', e.target.value)}
                        style={{ border: '1px solid #E8E8E5', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', fontWeight: 500, color: '#534AB7', background: '#EEEDFE', cursor: 'pointer' }}>
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px', background: '#F7F7F5', borderRadius: '8px', border: '1px solid #E8E8E5' }}>
                    {/* Column */}
                    <select value={f.column} onChange={e => updateFilter(f.id, 'column', e.target.value)}
                      style={{ border: '1px solid #E8E8E5', borderRadius: '4px', padding: '4px 6px', fontSize: FONT.size.xs, flex: 1, minWidth: 0 }}>
                      {(sourceColumns || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    {/* Operator */}
                    <select value={f.operator} onChange={e => updateFilter(f.id, 'operator', e.target.value)}
                      style={{ border: '1px solid #E8E8E5', borderRadius: '4px', padding: '4px 6px', fontSize: FONT.size.xs, width: '90px' }}>
                      {FILTER_OPS.map(op => <option key={op.value} value={op.value}>{op.label} ({op.desc})</option>)}
                    </select>
                    {/* Value */}
                    {opMeta?.needsValue !== false && (
                      <input value={f.value} onChange={e => updateFilter(f.id, 'value', e.target.value)}
                        placeholder={opMeta?.hint || 'value'}
                        style={{ border: '1px solid #E8E8E5', borderRadius: '4px', padding: '4px 6px', fontSize: FONT.size.xs, flex: 1, fontFamily: 'monospace', minWidth: 0 }} />
                    )}
                    {/* Remove */}
                    <span onClick={() => removeFilter(f.id)} style={{ cursor: 'pointer', flexShrink: 0 }}><CloseIcon color="#9B9B9B" size={10} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={addFilter}
          style={{ background: 'none', border: '1px dashed #534AB7', borderRadius: '8px', padding: '8px', width: '100%', fontSize: FONT.size.xs, color: '#534AB7', cursor: 'pointer', marginBottom: SPACING.lg }}>
          + Add filter condition
        </button>

        {/* SQL preview */}
        <p style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: '#6B6B6B', marginBottom: SPACING.xs }}>Preview</p>
        <div style={{ background: '#1A1A1A', borderRadius: '8px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#E1F5EE', overflowX: 'auto' }}>
          SELECT * FROM {sourceTable}<br />
          <span style={{ color: '#85B7EB' }}>{previewSQL}</span>
        </div>
      </div>
      <div style={{ ...FREC, gap: SPACING.xs, padding: `${SPACING.sm} ${SPACING.lg}`, borderTop: '1px solid #E8E8E5', flexShrink: 0 }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply}>Apply filters</Button>
      </div>
    </div>
  );
};

/* ================================================================
   HELPERS
   ================================================================ */
const Backdrop = ({ onClick }) => <div onClick={onClick} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.15)', zIndex: 99 }} />;

const ValidationErrors = ({ errors, onDismiss }) => {
  if (!errors?.length) return null;
  const hasOnlyWarnings = errors.every(e => e.startsWith('⚠'));
  const bg = hasOnlyWarnings ? '#FEF3C7' : '#FAECE7';
  const border = hasOnlyWarnings ? '#F59E0B' : '#D85A30';
  const textColor = hasOnlyWarnings ? '#854F0B' : '#712B13';
  const title = hasOnlyWarnings ? 'Mapping saved with warnings' : 'Validation errors';
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: `${SPACING.sm} ${SPACING.md}`, marginBottom: SPACING.md }}>
      <div style={{ ...FRBC, marginBottom: '6px' }}><span style={{ fontSize: FONT.size.sm, fontWeight: 500, color: textColor }}>{title}</span><span onClick={onDismiss} style={{ cursor: 'pointer', fontSize: FONT.size.xs, color: textColor }}>Dismiss</span></div>
      {errors.map((e, i) => <div key={i} style={{ fontSize: FONT.size.xs, color: textColor, padding: '2px 0' }}>{e}</div>)}
    </div>
  );
};

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
const ColumnMappingBoard = () => {
  const [data, setData] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [filters, setFilters] = useState({}); // { tableName: [filter] }
  const [hasChanges, setHasChanges] = useState(false);
  const [valErrors, setValErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [transformTarget, setTransformTarget] = useState(null);
  const [filterTarget, setFilterTarget] = useState(null); // { tableName, columns }
  const { pipelineId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await mappingApi.getByPipelineId(pipelineId);
        setData(res.data);
        const ex = [];
        (res.data.tablePairs || []).forEach(p => {
          (p.mappings || []).forEach(m => {
            const isTargetOnly = !m.sourceColumn || m.sourceColumn === '';
            ex.push({
              source: isTargetOnly ? null : `${p.sourceTable}.${m.sourceColumn}`,
              target: `${p.targetTable}.${m.targetColumn}`,
              color: COLOR_KEYS[ex.length % COLOR_KEYS.length],
              transforms: (m.transforms || []).map(t => ({ fn: t.fn, args: t.args || '' })),
              defaultValue: m.defaultValue,
              targetOnly: isTargetOnly,
            });
          });
        });
        setMappings(ex);
        // Load existing filters from backend — group by source table
        const loadedFilters = {};
        (res.data.tablePairs || []).forEach(p => {
          if (p.sourceTable && p.filters && p.filters.length > 0 && !loadedFilters[p.sourceTable]) {
            loadedFilters[p.sourceTable] = p.filters.map(f => ({
              columnName: f.columnName,
              operator: f.operator,
              value: f.value || '',
              logicalOperator: f.logicalOperator || 'AND',
              filterOrder: f.filterOrder,
            }));
          }
        });
        setFilters(loadedFilters);
      } catch (err) { setError(err); } finally { setLoading(false); }
    })();
  }, [pipelineId]);

  useEffect(() => { const h = e => { if (hasChanges) { e.preventDefault(); e.returnValue = 'Unsaved mappings.'; return e.returnValue; } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [hasChanges]);

  const sourceTables = [], targetTables = []; const srcS = new Set(), tgtS = new Set();
  if (data?.tablePairs) {
    data.tablePairs.forEach(p => {
      if (p.sourceTable && !srcS.has(p.sourceTable)) { srcS.add(p.sourceTable); sourceTables.push({ tableName: p.sourceTable, columns: (p.sourceColumns || []).map(c => ({ name: c.name, type: c.dataType, nullable: c.nullable, primaryKey: c.primaryKey })) }); }
      if (p.targetTable && !tgtS.has(p.targetTable)) { tgtS.add(p.targetTable); targetTables.push({ tableName: p.targetTable, columns: (p.targetColumns || []).map(c => ({ name: c.name, type: c.dataType, nullable: c.nullable, primaryKey: c.primaryKey })) }); }
    });
  }

  const handleChange = useCallback(m => { setMappings(m); setHasChanges(true); setValErrors([]); }, []);
  const handleAutoMap = useCallback(() => { const a = []; sourceTables.forEach(st => targetTables.forEach(tt => (st.columns || []).forEach(sc => { const m = (tt.columns || []).find(tc => tc.name.replace(/_/g, '').toLowerCase() === sc.name.replace(/_/g, '').toLowerCase()); if (m) { const sk = `${st.tableName}.${sc.name}`, tk = `${tt.tableName}.${m.name}`; if (!a.some(x => x.source === sk && x.target === tk)) a.push({ source: sk, target: tk, color: COLOR_KEYS[a.length % COLOR_KEYS.length], transforms: [] }); } }))); handleChange(a); }, [sourceTables, targetTables, handleChange]);
  const handleClearAll = useCallback(() => { if (mappings.length && window.confirm('Clear all?')) handleChange([]); }, [mappings, handleChange]);
  const handleMappingClick = useCallback((m, idx) => setTransformTarget({ mapping: m, idx }), []);
  const handleTransformApply = useCallback((idx, newT) => { setMappings(p => p.map((m, i) => i === idx ? { ...m, transforms: newT } : m)); setHasChanges(true); }, []);
  const handleFilterApply = useCallback((tableName, newFilters) => { setFilters(p => ({ ...p, [tableName]: newFilters })); setHasChanges(true); }, []);

  /** Add a target-only system mapping (e.g., CURRENT_TIMESTAMP for migrated_at) */
  const handleAddSystemValue = useCallback((targetTable, colName, fn, args) => {
    const targetKey = `${targetTable}.${colName}`;
    // Don't add duplicate
    if (mappings.some(m => m.target === targetKey && m.targetOnly)) return;
    const newMapping = { source: null, target: targetKey, color: 'purple', transforms: [{ fn, args: args || '' }], targetOnly: true };
    setMappings(p => [...p, newMapping]);
    setHasChanges(true);
  }, [mappings]);

  /** Add a target UDF mapping with pinned version and input column */
  const handleAddUdf = useCallback((targetTable, colName, udfConfig, primarySourceCol) => {
    const targetKey = `${targetTable}.${colName}`;
    const primarySource = primarySourceCol ? `${sourceTables[0]?.tableName || ''}.${primarySourceCol}` : null;
    const newMapping = {
      source: primarySource,
      target: targetKey,
      color: 'purple',
      transforms: [{ fn: 'UDF', args: JSON.stringify(udfConfig) }],
      targetOnly: !primarySource,
    };
    setMappings(p => [...p.filter(m => m.target !== targetKey), newMapping]);
    setHasChanges(true);
  }, [sourceTables]);

  const validate = useCallback(() => { const e = []; targetTables.forEach(tt => { const mp = new Set(mappings.filter(m => m.target.startsWith(tt.tableName + '.')).map(m => m.target.split('.')[1])); (tt.columns || []).forEach(c => { if (!c.nullable && !mp.has(c.name)) e.push(`${tt.tableName}: "${c.name}" is ${c.primaryKey ? 'PK' : 'NOT NULL'} — needs mapping`); }); }); return e; }, [targetTables, mappings]);

  const handleSave = async () => {
    // Validate but don't block — show warnings, allow partial save
    const warnings = validate();
    if (warnings.length > 0) {
      setValErrors(warnings.map(w => '⚠ ' + w));
      // Don't return — allow save to proceed with warnings
    }
    setSaving(true);
    try {
      // Group regular mappings by source::target table pair
      const tm = {};
      // Collect target-only mappings separately — grouped by target table
      const toMappings = {};

      mappings.forEach(m => {
        if (m.targetOnly || !m.source) {
          // Target-only mapping — group by target table
          const [tt, tc] = m.target.split('.');
          if (!toMappings[tt]) toMappings[tt] = [];
          toMappings[tt].push({ sc: null, tc, transforms: m.transforms || [], defaultValue: m.defaultValue });
        } else {
          // Regular source→target mapping
          const [st, sc] = m.source.split('.'), [tt, tc] = m.target.split('.');
          const k = `${st}::${tt}`;
          if (!tm[k]) tm[k] = { st, tt, cols: [] };
          tm[k].cols.push({ sc, tc, transforms: m.transforms || [], defaultValue: m.defaultValue });
        }
      });

      const en = {};
      Object.values(tm).forEach(({ st, tt, cols }) => {
        if (!en[st]) en[st] = { sourceTable: st, executionOrder: sourceTables.findIndex(s => s.tableName === st), targetMappings: [], filters: filters[st] || [] };
        // Merge target-only mappings for this target table
        const allCols = [...cols, ...(toMappings[tt] || [])];
        // Remove from toMappings so we don't add them again
        delete toMappings[tt];
        en[st].targetMappings.push({
          targetTable: tt,
          columnMappings: allCols.map((c, j) => ({
            sourceColumn: c.sc || null,
            targetColumn: c.tc,
            mappingOrder: j,
            defaultValue: c.defaultValue,
            transformations: (c.transforms || []).map((t, k) => ({ functionName: t.fn, arguments: t.args, executionOrder: k }))
          }))
        });
      });

      // Handle target-only mappings for target tables that have no regular mappings
      // Attach them to the first source table
      Object.entries(toMappings).forEach(([tt, cols]) => {
        const firstSource = sourceTables[0]?.tableName;
        if (!firstSource) return;
        if (!en[firstSource]) en[firstSource] = { sourceTable: firstSource, executionOrder: 0, targetMappings: [], filters: filters[firstSource] || [] };
        const existing = en[firstSource].targetMappings.find(tm => tm.targetTable === tt);
        if (existing) {
          existing.columnMappings.push(...cols.map((c, j) => ({
            sourceColumn: null, targetColumn: c.tc, mappingOrder: existing.columnMappings.length + j,
            defaultValue: c.defaultValue,
            transformations: (c.transforms || []).map((t, k) => ({ functionName: t.fn, arguments: t.args, executionOrder: k }))
          })));
        } else {
          en[firstSource].targetMappings.push({
            targetTable: tt,
            columnMappings: cols.map((c, j) => ({
              sourceColumn: null, targetColumn: c.tc, mappingOrder: j, defaultValue: c.defaultValue,
              transformations: (c.transforms || []).map((t, k) => ({ functionName: t.fn, arguments: t.args, executionOrder: k }))
            }))
          });
        }
      });

      sourceTables.forEach((s, i) => { if (!en[s.tableName]) en[s.tableName] = { sourceTable: s.tableName, executionOrder: i, targetMappings: [], filters: filters[s.tableName] || [] }; });
      await mappingApi.save(pipelineId, Object.values(en));
      setHasChanges(false); setValErrors([]);
    } catch (err) { setValErrors([err.message || 'Save failed']); } finally { setSaving(false); }
  };

  const unmappedReq = targetTables.reduce((n, tt) => { const mp = new Set(mappings.filter(m => m.target.startsWith(tt.tableName + '.')).map(m => m.target.split('.')[1])); return n + (tt.columns || []).filter(c => !c.nullable && !mp.has(c.name)).length; }, 0);
  const totalFilters = Object.values(filters).flat().length;

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<Loader message="Loading mappings..." />}>
      {data && (
        <div>
          <PageHeader breadcrumbs={[{ label: data.pipelineName, onClick: () => navigate('/pipelines') }, { label: LIT.title }]}
            actions={<>
              <Button variant="secondary" size="md" onClick={handleAutoMap}>Auto-map</Button>
              {mappings.length > 0 && <Button variant="secondary" size="md" onClick={handleClearAll}>Clear all</Button>}
              <Button size="md" onClick={handleSave} style={{ ...(hasChanges ? {} : { opacity: 0.5 }), ...(saving ? { opacity: 0.6 } : {}) }}>
                {saving ? 'Saving...' : hasChanges ? 'Save *' : LIT.saveMapping}
              </Button>
            </>} />
          <ValidationErrors errors={valErrors} onDismiss={() => setValErrors([])} />
          <div style={{ ...FRSC, gap: SPACING.sm, marginBottom: SPACING.xs, padding: `${SPACING.xs} ${SPACING.md}`, background: '#F7F7F5', borderRadius: '8px', fontSize: FONT.size.xs }}>
            <span style={{ color: '#6B6B6B' }}>{sourceTables.length} source → {targetTables.length} target</span>
            <span style={{ color: '#D4D4D0' }}>|</span>
            <span style={{ color: '#534AB7', fontWeight: 500 }}>{mappings.length} mapped</span>
            {unmappedReq > 0 && <><span style={{ color: '#D4D4D0' }}>|</span><span style={{ color: '#854F0B', fontWeight: 500 }}>{unmappedReq} required unmapped</span></>}
            {totalFilters > 0 && <><span style={{ color: '#D4D4D0' }}>|</span><span style={{ color: '#0C447C', fontWeight: 500 }}>{totalFilters} filter{totalFilters !== 1 ? 's' : ''}</span></>}
            {hasChanges && <><span style={{ color: '#D4D4D0' }}>|</span><span style={{ color: '#A32D2D' }}>Unsaved</span></>}
          </div>
          {sourceTables.length > 0 && targetTables.length > 0 ? (
            <DragMappingBoard
              sourceTables={sourceTables}
              targetTables={targetTables}
              mappings={mappings}
              onMappingsChange={handleChange}
              onMappingClick={handleMappingClick}
              onAddSystemValue={handleAddSystemValue}
              onAddUdf={handleAddUdf}
            />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#9B9B9B', border: '1px dashed #D4D4D0', borderRadius: '12px' }}>No tables configured.</div>
          )}

          {/* Source filter buttons per table */}
          <div style={{ marginTop: SPACING.sm }}>
            {sourceTables.map(st => {
              const fc = (filters[st.tableName] || []).length;
              return (
                <div key={st.tableName} onClick={() => setFilterTarget({ tableName: st.tableName, columns: st.columns })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: `${SPACING.xs} ${SPACING.sm}`, marginRight: SPACING.xs, background: fc > 0 ? '#E6F1FB' : '#F7F7F5', border: `1px solid ${fc > 0 ? '#85B7EB' : '#E8E8E5'}`, borderRadius: '8px', cursor: 'pointer', fontSize: FONT.size.xs }}>
                  <span style={{ fontSize: '14px' }}>+</span>
                  <span>Filter: {st.tableName}</span>
                  {fc > 0 && <span style={{ background: '#0C447C', color: '#fff', fontSize: '10px', padding: '0 5px', borderRadius: '99px' }}>{fc}</span>}
                </div>
              );
            })}
          </div>

          {/* Transform slide-over */}
          {transformTarget && (
            <>
              <Backdrop onClick={() => setTransformTarget(null)} />
              <TransformPanel
                mapping={transformTarget.mapping}
                mappingIdx={transformTarget.idx}
                sourceTables={sourceTables}
                onApply={handleTransformApply}
                onClose={() => setTransformTarget(null)}
              />
            </>
          )}
          {/* Filter slide-over */}
          {filterTarget && <><Backdrop onClick={() => setFilterTarget(null)} /><FilterPanel sourceTable={filterTarget.tableName} sourceColumns={filterTarget.columns} existingFilters={filters[filterTarget.tableName]} onApply={handleFilterApply} onClose={() => setFilterTarget(null)} /></>}
        </div>
      )}
    </ApiGuard>
  );
};

export default ColumnMappingBoard;