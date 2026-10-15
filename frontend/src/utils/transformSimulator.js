/**
 * Transform step simulation and sample data generator (<= 100 lines).
 */
export const simulateOne = (value, fn, args) => {
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
      } catch { return { ok: true, val: `[UDF(${value ?? 'row'})]` }; }
    }
    default: break;
  }
  if (value === null || value === undefined) return fn === 'DEFAULT_IF_NULL' ? { ok: true, val: args || '' } : { ok: true, val: null };
  const s = String(value);
  switch (fn) {
    case 'TRIM': return { ok: true, val: s.trim() };
    case 'UPPER': return { ok: true, val: s.toUpperCase() };
    case 'LOWER': return { ok: true, val: s.toLowerCase() };
    case 'APPEND':
    case 'CONCAT': return args ? { ok: true, val: s + args } : { ok: false, val: s, err: 'No suffix' };
    case 'PREPEND': return args ? { ok: true, val: args + s } : { ok: false, val: s, err: 'No prefix' };
    case 'CONCAT_COLUMNS': return args ? { ok: true, val: s + (args.includes('|') ? args.split('|')[0] : ' ') + '<cols>' } : { ok: false, val: s, err: 'Invalid' };
    case 'SUBSTRING': {
      const parts = (args || '').split(',').map((p) => parseInt(p.trim(), 10));
      if (isNaN(parts[0])) return { ok: false, val: s, err: 'Invalid start' };
      const start = parts[0], end = isNaN(parts[1]) ? s.length : parts[1];
      if (start < 0 || start > s.length || end < start) return { ok: false, val: s, err: 'Out of bounds' };
      return { ok: true, val: s.substring(start, end) };
    }
    case 'ROUND': {
      const n = Number(s.trim()); if (isNaN(n)) return { ok: false, val: s, err: 'Not a number' };
      const scale = args && args.trim() ? parseInt(args.trim(), 10) : 0;
      const factor = Math.pow(10, isNaN(scale) ? 0 : scale);
      return { ok: true, val: scale <= 0 ? Math.round(n) : Math.round(n * factor) / factor };
    }
    case 'CEIL': { const n = Number(s.trim()); return isNaN(n) ? { ok: false, val: s, err: 'Not a number' } : { ok: true, val: Math.ceil(n) }; }
    case 'FLOOR': { const n = Number(s.trim()); return isNaN(n) ? { ok: false, val: s, err: 'Not a number' } : { ok: true, val: Math.floor(n) }; }
    case 'ABS': { const n = Number(s.trim()); return isNaN(n) ? { ok: false, val: s, err: 'Not a number' } : { ok: true, val: Math.abs(n) }; }
    case 'TRUNC': {
      const n = Number(s.trim()); if (isNaN(n)) return { ok: false, val: s, err: 'Not a number' };
      const scale = args && args.trim() ? parseInt(args.trim(), 10) : 0;
      const factor = Math.pow(10, Math.max(0, scale)); return { ok: true, val: Math.trunc(n * factor) / factor };
    }
    case 'TO_STRING': return { ok: true, val: s };
    case 'TO_NUMBER': {
      const trimmed = s.trim(); if (!trimmed) return { ok: true, val: null };
      if (trimmed.toLowerCase() === 'true') return { ok: true, val: 1 };
      if (trimmed.toLowerCase() === 'false') return { ok: true, val: 0 };
      const n = Number(trimmed); if (!isNaN(n)) return { ok: true, val: n };
      const p = Date.parse(trimmed); return !isNaN(p) ? { ok: true, val: p } : { ok: false, val: s, err: 'Not a number' };
    }
    case 'TO_BOOLEAN': {
      const low = s.trim().toLowerCase(); if (!low) return { ok: true, val: null };
      if (['true', 'yes', '1', 'y', 't', 'on'].includes(low)) return { ok: true, val: true };
      if (['false', 'no', '0', 'n', 'f', 'off'].includes(low)) return { ok: true, val: false };
      return { ok: false, val: s, err: 'Not a boolean' };
    }
    case 'TO_DATE': {
      const trimmed = s.trim(); if (!trimmed) return { ok: true, val: null };
      if (/^(19|20)\d{6}$/.test(trimmed)) return { ok: true, val: `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}` };
      const d = new Date(trimmed); return isNaN(d.getTime()) ? { ok: false, val: s, err: 'Invalid date' } : { ok: true, val: d.toISOString().split('T')[0] };
    }
    case 'DEFAULT_IF_NULL': return { ok: true, val: s };
    case 'TO_JSON': return args ? { ok: true, val: `{"${args}": "${s}"}` } : { ok: false, val: s, err: 'No field name' };
    case 'TO_JSON_ARRAY': return { ok: true, val: args ? `{"${args}": ["${s}"]}` : `["${s}"]` };
    default: return { ok: true, val: s };
  }
};

export const simulateChain = (sourceValue, steps = [], chainAnalysis) => {
  let current = sourceValue; const results = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]; const stepEval = chainAnalysis?.steps?.[i];
    if (stepEval?.typeError) { results.push({ ok: false, val: current, err: stepEval.typeError }); break; }
    const r = simulateOne(current, step.fn, step.args);
    results.push(r); if (!r.ok) break; current = r.val;
  }
  return results;
};

export const getSampleData = (normType, firstStepFn) => {
  if (normType === 'STRING') {
    if (firstStepFn === 'TO_NUMBER' || ['ROUND', 'CEIL', 'FLOOR', 'ABS', 'TRUNC'].includes(firstStepFn)) return ['123.45', '42', '-17.5', '0', null];
    if (firstStepFn === 'TO_DATE') return ['2024-03-15', '2026-10-10', '2023-12-01', null];
    if (firstStepFn === 'TO_BOOLEAN') return ['true', 'false', '1', '0', null];
  }
  const map = { NUMBER: ['123.45', '42', '-17.5', '0', null], DATE: ['2024-03-15', '2026-10-10', '2023-12-01', null], BOOLEAN: ['true', 'false', '1', '0', null], JSON: ['{"id": 101, "name": "Alpha"}', '{"status": "active"}', null] };
  return map[normType] || ['abc', 'John Doe', '  sample text  ', '', null];
};
