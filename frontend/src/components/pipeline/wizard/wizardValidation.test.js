import { validateWizardStep } from './wizardValidation';

describe('validateWizardStep', () => {
  test('validates Step 0 (Basics)', () => {
    expect(validateWizardStep(0, { name: '' }).name).toBeDefined();
    expect(validateWizardStep(0, { name: 'Orders' }).name).toBeUndefined();
  });

  test('validates Step 1 (Source Adapter)', () => {
    // Oracle JDBC requires source connection
    const oraErr = validateWizardStep(1, { sourceAdapter: 'oracle-jdbc', source: '' });
    expect(oraErr.source).toContain('Source connection is mandatory');

    const oraPass = validateWizardStep(1, { sourceAdapter: 'oracle-jdbc', source: 'c-1' });
    expect(oraPass.source).toBeUndefined();

    // Oracle trail requires directory path
    const trailErr = validateWizardStep(1, { sourceAdapter: 'oracle-trail', cdcDirectoryPath: '' });
    expect(trailErr.cdcDirectoryPath).toBeDefined();
  });

  test('validates Step 2 (Target Destination)', () => {
    // Postgres writer requires target connection
    const pgErr = validateWizardStep(2, { targetAdapter: 'postgres-writer', target: '' });
    expect(pgErr.target).toContain('Target connection is mandatory');

    // S3 writer requires target connection and bucket
    const s3Err = validateWizardStep(2, { targetAdapter: 's3-writer', target: '', s3Bucket: '' });
    expect(s3Err.target).toContain('AWS connection is mandatory');
    expect(s3Err.s3Bucket).toBeDefined();
  });

  test('validates Step 3 (Entities & Duplicates)', () => {
    // Empty pairs
    expect(validateWizardStep(3, { entityPairs: [] }).entityPairs).toBeDefined();

    // DB source missing table
    const dbErr = validateWizardStep(3, {
      sourceAdapter: 'oracle-jdbc',
      entityPairs: [{ sourceEntity: '', targetEntity: 'cust' }],
    });
    expect(dbErr.entityPairs).toContain('Source table is required');

    // Duplicate pair
    const dupErr = validateWizardStep(3, {
      entityPairs: [
        { sourceEntity: 'CUSTOMERS', targetEntity: 'cust' },
        { sourceEntity: 'CUSTOMERS', targetEntity: 'cust' },
      ],
    });
    expect(dupErr.entityPairs).toContain('Duplicate pair');

    // Valid 1:N pairs (allowed because pairs are unique)
    const valid1ToN = validateWizardStep(3, {
      entityPairs: [
        { sourceEntity: 'CUSTOMERS', targetEntity: 'cust_lake' },
        { sourceEntity: 'CUSTOMERS', targetEntity: 'cust_audit' },
      ],
    });
    expect(valid1ToN.entityPairs).toBeUndefined();
  });
});
