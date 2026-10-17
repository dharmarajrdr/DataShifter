import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { settingsApi } from '../../../services/api';

export const usePipelineSettings = () => {
  const { hasPermission } = useAuth();
  const canViewPipeline = hasPermission('pipeline:view');
  const canEditSettings = hasPermission('settings:edit');
  const [accessDenied, setAccessDenied] = useState(false);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tableOverrides, setTableOverrides] = useState({});
  const { pipelineId } = useParams();
  const notification = useNotification();

  const fetchSettings = useCallback(() => {
    if (!canViewPipeline || !canEditSettings) return;
    settingsApi.getByPipelineId(pipelineId).then((res) => {
      setSettings(res.data);
      const overrides = {};
      (res.data.tables || []).forEach((pt) => {
        (pt.targetMappings || []).forEach((ttm) => {
          overrides[ttm.id] = ttm.writeMode || 'UPSERT';
        });
      });
      setTableOverrides(overrides);
    }).catch((err) => {
      if (err?.response?.status === 403) setAccessDenied(true);
    });
  }, [pipelineId, canViewPipeline, canEditSettings]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const update = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateTableWriteMode = (ttmId, mode) => {
    setTableOverrides((prev) => ({ ...prev, [ttmId]: mode }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (settings?.status === 'RUNNING') {
      notification.warning('Pause the pipeline before updating settings');
      return;
    }
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: settings.name, description: settings.description, chunkSize: settings.chunkSize,
        defaultWriteMode: settings.defaultWriteMode || 'UPSERT', ignoreExceptions: settings.ignoreExceptions,
        maxErrorThreshold: settings.maxErrorThreshold, logSourceRow: settings.logSourceRow,
        sourcePoolSize: settings.sourcePoolSize, targetPoolSize: settings.targetPoolSize,
        previewInflightRecords: settings.previewInflightRecords,
        pipelineMode: settings.pipelineMode || 'BATCH',
        cdcLogType: settings.cdcLogType || 'ORACLE_TRAIL',
        cdcDirectoryPath: settings.cdcDirectoryPath,
        cdcFilePattern: settings.cdcFilePattern,
        cdcStartingScn: settings.cdcStartingScn,
        cdcFlushIntervalMs: settings.cdcFlushIntervalMs,
        cdcBatchSize: settings.cdcBatchSize,
        tableWriteModeOverrides: Object.entries(tableOverrides).map(([ttmId, mode]) => ({
          targetTableMappingId: ttmId, writeMode: mode,
        })),
      };
      await settingsApi.save(pipelineId, payload);
      setHasChanges(false);
      notification.success('Settings saved successfully');
    } catch (e) {
      notification.error('Save failed: ' + (e?.response?.data?.message || e.message || 'Unknown error'));
    } finally { setSaving(false); }
  };

  const allTargetMappings = [];
  (settings?.tables || []).forEach((pt) => {
    (pt.targetMappings || []).forEach((ttm) => {
      allTargetMappings.push({
        ttmId: ttm.id, ptId: pt.id, sourceTable: pt.sourceTable, targetTable: ttm.targetTable,
        currentMode: tableOverrides[ttm.id] || ttm.writeMode || 'UPSERT',
      });
    });
  });

  return {
    pipelineId, settings, saving, hasChanges, tableOverrides, allTargetMappings,
    canViewPipeline, canEditSettings, accessDenied,
    update, updateTableWriteMode, handleSave, fetchSettings,
  };
};
