/**
 * Pure validation logic for all 5 Pipeline Wizard steps (<= 100 lines).
 */
export const validateWizardStep = (step, config = {}) => {
  const errs = {};

  if (step === 0) {
    if (!config.name?.trim()) errs.name = 'Pipeline name is required';
    return errs;
  }

  if (step === 1) {
    const srcAdp = config.sourceAdapter || 'oracle-trail';
    if (['oracle-jdbc', 'postgres-jdbc'].includes(srcAdp)) {
      if (!config.source) errs.source = 'Source connection is mandatory. Please select a connection.';
    } else if (srcAdp === 'oracle-trail' && !config.cdcDirectoryPath?.trim()) {
      errs.cdcDirectoryPath = 'Trail directory path is required';
    } else if (srcAdp === 'filesystem' && !config.cdcDirectoryPath?.trim()) {
      errs.cdcDirectoryPath = 'Source file directory path is required';
    }
    return errs;
  }

  if (step === 2) {
    const tgtAdp = config.targetAdapter || 's3-writer';
    if (['oracle-writer', 'postgres-writer'].includes(tgtAdp)) {
      if (!config.target) errs.target = 'Target connection is mandatory. Please select a connection.';
    } else if (tgtAdp === 's3-writer') {
      if (!config.target) errs.target = 'AWS connection is mandatory. Please select an S3 connection.';
      if (!config.s3Bucket?.trim()) errs.s3Bucket = 'S3 bucket name is required';
    } else if (tgtAdp === 'kafka-writer') {
      if (!config.kafkaBootstrap?.trim()) errs.kafkaBootstrap = 'Bootstrap servers are required';
      if (!config.kafkaTopic?.trim()) errs.kafkaTopic = 'Destination topic is required';
    } else if (tgtAdp === 'snowflake-writer' && !config.snowflakeAccount?.trim()) {
      errs.snowflakeAccount = 'Snowflake account is required';
    }
    return errs;
  }

  if (step === 3) {
    const pairs = config.entityPairs || [];
    if (pairs.length === 0) {
      errs.entityPairs = 'At least one entity mapping is required';
      return errs;
    }
    const isSrcDb = ['oracle-jdbc', 'postgres-jdbc'].includes(config.sourceAdapter || '');
    const isTgtDb = ['postgres-writer', 'oracle-writer'].includes(config.targetAdapter || '');
    const seen = new Set();
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      if (isSrcDb && !p.sourceEntity?.trim()) {
        errs.entityPairs = `Source table is required for entity #${i + 1}`;
        break;
      }
      if (isTgtDb && !p.targetEntity?.trim()) {
        errs.entityPairs = `Destination table is required for entity #${i + 1}`;
        break;
      }
      const k = `${(p.sourceEntity || '').trim().toUpperCase()}:::${(p.targetEntity || '').trim().toUpperCase()}`;
      if (p.sourceEntity && p.targetEntity && seen.has(k)) {
        errs.entityPairs = `Duplicate pair "${p.sourceEntity} → ${p.targetEntity}" detected. Pairs must be unique.`;
        break;
      }
      seen.add(k);
    }
  }

  return errs;
};

export default validateWizardStep;
