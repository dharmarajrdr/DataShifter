import { COLOR_KEYS } from '../../../constants/transformMeta';
import { parseDdlColumns } from '../../../utils/ddlParser';
import { splitTableCol } from './DragBoardConstants';

const toCol = (c) => ({ name: c.name, type: c.dataType || c.type, nullable: c.nullable, primaryKey: c.primaryKey });

export const isSystemValueTransform = (t) => {
  if (!t) return false;
  const fn = t.fn || t.functionName;
  if (['CURRENT_TIMESTAMP', 'CURRENT_DATE', 'UUID', 'ROW_NUMBER', 'UDF'].includes(fn)) return true;
  if (fn === 'STATIC_VALUE') return Boolean(t.args && t.args.trim());
  return false;
};

export const isMappingValidForTarget = (m) => {
  if (!m || !m.target) return false;
  if (m.source) return true;
  if (m.defaultValue && m.defaultValue.trim()) return true;
  if (m.transforms && m.transforms.length > 0) {
    return m.transforms.some(isSystemValueTransform);
  }
  return false;
};

export const parseMappingsFromResponse = (data) => {
  const ex = [];
  if (data?.tablePairs?.length) {
    data.tablePairs.forEach((p) => {
      (p.mappings || p.columnMappings || []).forEach((m) => {
        const sCol = m.sourceColumn || (m.source?.includes('.') ? splitTableCol(m.source)[1] : m.source);
        const tCol = m.targetColumn || (m.target?.includes('.') ? splitTableCol(m.target)[1] : m.target);
        ex.push({
          id: m.id, source: sCol ? `${p.sourceTable}.${sCol}` : null, target: `${p.targetTable}.${tCol}`,
          color: m.color || COLOR_KEYS[ex.length % COLOR_KEYS.length], defaultValue: m.defaultValue, targetOnly: !sCol,
          transforms: (m.transforms || []).map((t) => ({ fn: t.fn || t.functionName, args: t.args || t.arguments || '' })),
        });
      });
    });
  } else if (Array.isArray(data?.mappings)) {
    data.mappings.forEach((m) => {
      const sT = data.sourceTable || 'source', tT = data.targetTable || 'target';
      const sCol = m.sourceColumn || m.source, tCol = m.targetColumn || m.target;
      const src = sCol ? (sCol.includes('.') ? sCol : `${sT}.${sCol}`) : null;
      ex.push({
        id: m.id, source: src, target: tCol ? (tCol.includes('.') ? tCol : `${tT}.${tCol}`) : '',
        color: m.color || COLOR_KEYS[ex.length % COLOR_KEYS.length], defaultValue: m.defaultValue, targetOnly: !src,
        transforms: (m.transforms || []).map((t) => ({ fn: t.fn || t.functionName, args: t.args || t.arguments || '' })),
      });
    });
  }
  return ex;
};

export const extractTablesFromResponse = (data) => {
  const sourceTables = [], targetTables = [];
  const srcS = new Set(), tgtS = new Set();
  (data?.tablePairs || []).forEach((p) => {
    if (p.sourceTable && !srcS.has(p.sourceTable)) {
      srcS.add(p.sourceTable);
      let cols = (p.sourceColumns || []).map(toCol);
      if ((!cols || cols.length === 0) && p.sourceSchemaSql) {
        cols = parseDdlColumns(p.sourceSchemaSql).map(toCol);
      }
      sourceTables.push({ tableName: p.sourceTable, columns: cols, sourceSchemaSql: p.sourceSchemaSql });
    }
    if (p.targetTable && !tgtS.has(p.targetTable)) {
      tgtS.add(p.targetTable); targetTables.push({ tableName: p.targetTable, columns: (p.targetColumns || []).map(toCol) });
    }
  });
  if (!data?.tablePairs?.length) {
    if (data?.sourceTable && data?.sourceColumns) sourceTables.push({ tableName: data.sourceTable, columns: data.sourceColumns.map(toCol) });
    if (data?.targetTable && data?.targetColumns) targetTables.push({ tableName: data.targetTable, columns: data.targetColumns.map(toCol) });
  }
  return { sourceTables, targetTables };
};

export const buildSavePayload = (mappings = [], filters = {}, sourceTables = []) => {
  if (!sourceTables.length) return mappings;
  const tm = {}, toMappings = {};
  mappings.forEach((m) => {
    if (m.targetOnly || !m.source) {
      const [tt, tc] = splitTableCol(m.target);
      (toMappings[tt] = toMappings[tt] || []).push({ sc: null, tc, transforms: m.transforms || [], defaultValue: m.defaultValue });
    } else {
      const [st, sc] = splitTableCol(m.source), [tt, tc] = splitTableCol(m.target);
      const k = `${st}::${tt}`;
      (tm[k] = tm[k] || { st, tt, cols: [] }).cols.push({ sc, tc, transforms: m.transforms || [], defaultValue: m.defaultValue });
    }
  });
  const toCm = (c, j) => ({ sourceColumn: c.sc || null, targetColumn: c.tc, mappingOrder: j, defaultValue: c.defaultValue, transformations: (c.transforms || []).map((t, k) => ({ functionName: t.fn, arguments: t.args || '', executionOrder: k })) });
  const en = {};
  Object.values(tm).forEach(({ st, tt, cols }) => {
    const sObj = sourceTables.find((s) => s.tableName === st);
    if (!en[st]) en[st] = { sourceTable: st, executionOrder: sourceTables.findIndex((s) => s.tableName === st), targetMappings: [], filters: filters[st] || [], sourceSchemaSql: sObj?.sourceSchemaSql };
    const allCols = [...cols, ...(toMappings[tt] || [])];
    delete toMappings[tt];
    en[st].targetMappings.push({ targetTable: tt, columnMappings: allCols.map(toCm) });
  });
  Object.entries(toMappings).forEach(([tt, cols]) => {
    const fSrc = sourceTables[0]?.tableName;
    if (!fSrc) return;
    if (!en[fSrc]) en[fSrc] = { sourceTable: fSrc, executionOrder: 0, targetMappings: [], filters: filters[fSrc] || [], sourceSchemaSql: sourceTables[0]?.sourceSchemaSql };
    const exT = en[fSrc].targetMappings.find((t) => t.targetTable === tt);
    if (exT) exT.columnMappings.push(...cols.map((c, j) => toCm(c, exT.columnMappings.length + j)));
    else en[fSrc].targetMappings.push({ targetTable: tt, columnMappings: cols.map(toCm) });
  });
  sourceTables.forEach((s, i) => {
    if (!en[s.tableName]) en[s.tableName] = { sourceTable: s.tableName, executionOrder: i, targetMappings: [], filters: filters[s.tableName] || [], sourceSchemaSql: s.sourceSchemaSql };
  });
  return Object.values(en);
};
