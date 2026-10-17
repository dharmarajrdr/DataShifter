import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { connectionApi, namespaceApi, pipelineApi } from '../../../services/api';

import { validateWizardStep } from './wizardValidation';

/**
 * Custom hook managing 5-Step Pipeline Wizard state & actions (<= 100 lines).
 */
export const usePipelineWizard = () => {
  const [step, setStep] = useState(0);
  const [namespaces, setNamespaces] = useState([]);
  const [connections, setConnections] = useState([]);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState({});
  const [showCreateNs, setShowCreateNs] = useState(false);

  const [config, setConfig] = useState({
    name: '', description: '', namespaceId: '', sourceAdapter: 'oracle-trail',
    targetAdapter: 's3-writer', source: '', target: '', s3Bucket: 'datashifter-analytics-lake/raw',
    s3Region: 'us-east-1', s3AccessKey: '', s3SecretKey: '', cdcDirectoryPath: '/u01/app/oracle/dirdat',
    cdcFilePattern: 'aa.*', cdcStartingScn: '', cdcFlushIntervalMs: 200, cdcBatchSize: 500,
    entityPairs: [
      { sourceEntity: 'HR.CUSTOMERS', targetEntity: 'customers_parquet/' },
      { sourceEntity: 'SALES.ORDERS', targetEntity: 'orders_parquet/' },
    ],
  });

  const navigate = useNavigate();
  const notification = useNotification();

  useEffect(() => {
    namespaceApi.getAll().then((res) => {
      const list = res.data || [];
      setNamespaces(list);
      const def = list.find((n) => n.name === 'Default');
      if (def) setConfig((p) => ({ ...p, namespaceId: def.id }));
    });
    connectionApi.getAll().then((res) => setConnections(res.data || []));
  }, []);

  const validateCurrentStep = useCallback(() => {
    const errs = validateWizardStep(step, config);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const msg = Object.values(errs)[0];
      if (msg && notification?.error) notification.error(msg);
      return false;
    }
    return true;
  }, [step, config, notification]);

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    if (step === 0) navigate('/pipelines');
    else setStep((s) => Math.max(s - 1, 0));
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const isCdc = ['oracle-trail', 'postgres-wal'].includes(config.sourceAdapter);
      const payload = {
        name: config.name.trim(),
        description: config.description?.trim() || '',
        namespaceId: config.namespaceId || null,
        sourceConnectionId: config.source || config.sourceAdapter,
        targetConnectionId: config.target || config.targetAdapter,
        sourceTables: config.entityPairs.map((p) => p.sourceEntity),
        targetTables: config.entityPairs.map((p) => p.targetEntity),
        tables: config.entityPairs.map((p, i) => ({ sourceTable: p.sourceEntity, targetTable: p.targetEntity, executionOrder: i })),
        pipelineMode: isCdc ? 'CDC' : 'BATCH',
        cdcDirectoryPath: config.cdcDirectoryPath,
        cdcFilePattern: config.cdcFilePattern,
      };
      const res = await pipelineApi.create(payload);
      notification.success(`Pipeline "${config.name.trim()}" created successfully!`);
      navigate(res.data?.id ? `/pipelines/${res.data.id}/mapping` : '/pipelines');
    } catch (err) {
      setErrors({ create: err.message || 'Failed to create pipeline' });
      notification.error(err.message || 'Failed to create pipeline');
    } finally {
      setCreating(false);
    }
  };

  return {
    step, setStep, config, setConfig, namespaces, setNamespaces, connections,
    creating, errors, showCreateNs, setShowCreateNs, handleNext, handleBack, handleCreate,
  };
};

export default usePipelineWizard;
