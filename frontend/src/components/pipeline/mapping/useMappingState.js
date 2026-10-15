import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import { mappingApi, pipelineApi } from '../../../services/api';
import { COLOR_KEYS } from '../../../constants/transformMeta';

export const useMappingState = (pipelineId, canViewPipeline, canEdit) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [filters, setFilters] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateDisabled, setValidateDisabled] = useState(true);
  const [valErrors, setValErrors] = useState([]);
  const notification = useNotification();

  useEffect(() => {
    if (!pipelineId || !canViewPipeline) return;
    (async () => {
      try {
        setLoading(true);
        const res = await mappingApi.get(pipelineId);
        setData(res.data);
        const ex = [];
        (res.data?.tablePairs || []).forEach((p) => {
          (p.columnMappings || []).forEach((m) => {
            const isTargetOnly = !m.sourceColumn;
            ex.push({
              source: isTargetOnly ? null : `${p.sourceTable}.${m.sourceColumn}`,
              target: `${p.targetTable}.${m.targetColumn}`,
              color: m.color || COLOR_KEYS[ex.length % COLOR_KEYS.length],
              transforms: (m.transforms || []).map((t) => ({ fn: t.fn, args: t.args || '' })),
              defaultValue: m.defaultValue, targetOnly: isTargetOnly,
            });
          });
        });
        setMappings(ex);
        const loadedFilters = {};
        (res.data.tablePairs || []).forEach((p) => {
          if (p.sourceTable && p.filters?.length) loadedFilters[p.sourceTable] = p.filters;
        });
        setFilters(loadedFilters);
      } catch (err) { setError(err); } finally { setLoading(false); }
    })();
  }, [pipelineId, canViewPipeline]);

  const sourceTables = [], targetTables = [];
  const srcS = new Set(), tgtS = new Set();
  (data?.tablePairs || []).forEach((p) => {
    if (p.sourceTable && !srcS.has(p.sourceTable)) {
      srcS.add(p.sourceTable);
      sourceTables.push({ tableName: p.sourceTable, columns: (p.sourceColumns || []).map((c) => ({ name: c.name, type: c.dataType, nullable: c.nullable, primaryKey: c.primaryKey })) });
    }
    if (p.targetTable && !tgtS.has(p.targetTable)) {
      tgtS.add(p.targetTable);
      targetTables.push({ tableName: p.targetTable, columns: (p.targetColumns || []).map((c) => ({ name: c.name, type: c.dataType, nullable: c.nullable, primaryKey: c.primaryKey })) });
    }
  });

  const handleChange = useCallback((m) => { setMappings(m); setHasChanges(true); setValidateDisabled(true); setValErrors([]); }, []);
  const handleAutoMap = useCallback(() => {
    const a = [];
    sourceTables.forEach((st) => targetTables.forEach((tt) => (st.columns || []).forEach((sc) => {
      const m = (tt.columns || []).find((tc) => tc.name.replace(/_/g, '').toLowerCase() === sc.name.replace(/_/g, '').toLowerCase());
      if (m) {
        const sk = `${st.tableName}.${sc.name}`, tk = `${tt.tableName}.${m.name}`;
        if (!a.some((x) => x.source === sk && x.target === tk)) a.push({ source: sk, target: tk, color: COLOR_KEYS[a.length % COLOR_KEYS.length], transforms: [] });
      }
    })));
    handleChange(a);
  }, [sourceTables, targetTables, handleChange]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await mappingApi.save(pipelineId, mappings);
      setHasChanges(false); setValidateDisabled(false); notification.success('Mappings saved successfully');
    } catch (err) { notification.error(err.message || 'Save failed'); } finally { setSaving(false); }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await pipelineApi.performAction(pipelineId, 'VALIDATE');
      setValErrors(res.data?.validationErrors || []); setValidateDisabled(true);
      if (!res.data?.validationErrors?.length) notification.success('Pipeline mapping validated');
      else notification.warning(`Validation completed with ${res.data.validationErrors.length} issue(s)`);
    } catch (err) { notification.error(err.message || 'Validation failed'); } finally { setValidating(false); }
  };

  return {
    data, loading, error, mappings, setMappings, filters, setFilters, hasChanges, setHasChanges,
    saving, validating, validateDisabled, valErrors, setValErrors, sourceTables, targetTables,
    handleChange, handleAutoMap, handleSave, handleValidate,
  };
};

export default useMappingState;
