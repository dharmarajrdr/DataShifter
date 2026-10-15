/**
 * Data type normalization and target compatibility validation (<= 100 lines).
 */
export const normalizeDataType = (rawType) => {
  if (!rawType) return 'STRING';
  const t = rawType.toUpperCase().trim().replace(/\s*\([^)]*\)/g, '');
  if (t.includes('DATE') || t.includes('TIME') || t.includes('TIMESTAMP') || t.includes('INTERVAL')) {
    return 'DATE';
  }
  if (t.includes('BOOL') || t === 'BIT') {
    return 'BOOLEAN';
  }
  if (t.includes('JSON')) {
    return 'JSON';
  }
  if (
    t.includes('INT') || t.includes('NUM') || t.includes('DEC') ||
    t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('REAL') ||
    t.includes('SERIAL') || t.includes('MONEY')
  ) {
    return 'NUMBER';
  }
  return 'STRING';
};

export const validateInputForType = (val, type) => {
  if (val === null || val === undefined || val === '') {
    return { ok: true, message: null };
  }
  const s = String(val).trim();
  switch (type) {
    case 'NUMBER': {
      const n = Number(s);
      if (isNaN(n)) return { ok: false, message: `"${s}" is not a valid number for column type ${type}` };
      return { ok: true, message: null };
    }
    case 'DATE': {
      const d = Date.parse(s);
      if (isNaN(d)) return { ok: false, message: `"${s}" is not a valid date for column type ${type} (expected YYYY-MM-DD or ISO)` };
      return { ok: true, message: null };
    }
    case 'BOOLEAN': {
      const valid = ['true', 'false', '1', '0', 'yes', 'no', 't', 'f', 'y', 'n'];
      if (!valid.includes(s.toLowerCase())) return { ok: false, message: `"${s}" is not a valid boolean for column type ${type} (expected true/false, 1/0)` };
      return { ok: true, message: null };
    }
    case 'JSON': {
      try {
        JSON.parse(s);
        return { ok: true, message: null };
      } catch {
        return { ok: false, message: `"${s}" is not valid JSON` };
      }
    }
    case 'STRING':
    default:
      return { ok: true, message: null };
  }
};

export const checkTargetCompatibility = (outputType, targetType) => {
  if (!targetType || outputType === 'ANY' || targetType === 'ANY') return { ok: true };
  if (outputType === targetType) return { ok: true };
  if (targetType === 'STRING') return { ok: true };
  if (targetType === 'NUMBER' && outputType !== 'NUMBER') {
    return { ok: false, error: `Target column expects NUMBER, but transformation outputs ${outputType}. Add TO_NUMBER to convert.` };
  }
  if (targetType === 'DATE' && outputType !== 'DATE') {
    return { ok: false, error: `Target column expects DATE, but transformation outputs ${outputType}. Add TO_DATE to convert.` };
  }
  if (targetType === 'BOOLEAN' && outputType !== 'BOOLEAN') {
    return { ok: false, error: `Target column expects BOOLEAN, but transformation outputs ${outputType}. Add TO_BOOLEAN to convert.` };
  }
  if (targetType === 'JSON' && outputType !== 'JSON') {
    return { ok: false, error: `Target column expects JSON, but transformation outputs ${outputType}. Add TO_JSON to convert.` };
  }
  return { ok: true };
};
