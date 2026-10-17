import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import { mappingApi, pipelineApi } from '../../../services/api';
import { COLOR_KEYS } from '../../../constants/transformMeta';
import { buildSavePayload, extractTablesFromResponse, parseMappingsFromResponse } from './mappingPayloadHelper';

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
  const savedState = useRef({ mappings: [], filters: {} });
  const notification = useNotification();

  useEffect(() => {
    if (!pipelineId || !canViewPipeline) return;
    (async () => {
      try {
        setLoading(true);
        const res = await (mappingApi.getByPipelineId || mappingApi.get)(pipelineId);
        setData(res.data);
        const initM = parseMappingsFromResponse(res.data);
        setMappings(initM);
        const loadedFilters = {};
        (res.data?.tablePairs || []).forEach((p) => {
          if (p.sourceTable && p.filters?.length) loadedFilters[p.sourceTable] = p.filters;
        });
        setFilters(loadedFilters);
        savedState.current = { mappings: initM, filters: loadedFilters };
      } catch (err) { setError(err); } finally { setLoading(false); }
    })();
  }, [pipelineId, canViewPipeline]);

  const { sourceTables, targetTables } = useMemo(() => extractTablesFromResponse(data), [data]);

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

  const handleCancel = useCallback(() => {
    setMappings(savedState.current.mappings);
    setFilters(savedState.current.filters);
    setHasChanges(false);
    setValErrors([]);
    setValidateDisabled(savedState.current.mappings.length === 0);
    notification.info?.('Unsaved changes discarded');
  }, [notification]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildSavePayload(mappings, filters, sourceTables);
      await mappingApi.save(pipelineId, payload);
      savedState.current = { mappings, filters };
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
    handleChange, handleAutoMap, handleCancel, handleSave, handleValidate,
  };
};

export default useMappingState;
