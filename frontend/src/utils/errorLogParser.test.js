import { parseErrorDetails, formatErrorTimestamp } from './errorLogParser';

describe('errorLogParser', () => {
  test('parses Oracle ORA-00001 duplicate key error correctly', () => {
    const raw =
      '1 rows failed in chunk 0. First error: Duplicate key: ORA-00001: unique constraint (DEV_USER.SYS_C008747) violated on table DEV_USER.PRODUCT_MASTER columns (ID) ORA-03301: (ORA-00001 details) row with column values (ID:1) already exists https://docs.oracle.com/error-help/db/ora-00001/ — The target table already has a row with this key. Use UPSERT write mode to handle duplicates, or TRUNCATE the target table before re-running.';
    const parsed = parseErrorDetails(raw, 'PK_DUPLICATE');

    expect(parsed.code).toBe('ORA-00001');
    expect(parsed.constraint).toBe('DEV_USER.SYS_C008747');
    expect(parsed.conflict).toBe('ID');
    expect(parsed.docUrl).toBe('https://docs.oracle.com/error-help/db/ora-00001/');
    expect(parsed.remediation).toContain('Use UPSERT write mode');
  });

  test('parses ENGINE_OFFLINE system error', () => {
    const raw = 'ENGINE_OFFLINE: Execution engine is offline or unavailable. Please ensure execution-engine service is running.';
    const parsed = parseErrorDetails(raw, 'SYSTEM_ERROR');

    expect(parsed.code).toBe('ENGINE_OFFLINE');
    expect(parsed.remediation).toContain('execution-engine');
  });

  test('formats timestamp properly', () => {
    const formatted = formatErrorTimestamp('2026-10-18T00:07:08.000Z');
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
