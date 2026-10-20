import { parseMappingsFromResponse, extractTablesFromResponse, buildSavePayload, isSystemValueTransform, isMappingValidForTarget } from './mappingPayloadHelper';

describe('mappingPayloadHelper', () => {
  const sampleBackendData = {
    pipelineId: 'p-1',
    tablePairs: [{
      sourceTable: 'orders',
      targetTable: 'ORDERS',
      sourceColumns: [{ name: 'order_number', dataType: 'varchar', nullable: false, primaryKey: true }],
      targetColumns: [{ name: 'ORDER_NO', dataType: 'VARCHAR', nullable: false, primaryKey: true }],
      mappings: [
        { id: 'm-1', sourceColumn: 'order_number', targetColumn: 'ORDER_NO', defaultValue: null, transforms: [] },
        { id: 'm-2', sourceColumn: null, targetColumn: 'CREATED_AT', defaultValue: 'NOW()', transforms: [{ fn: 'CURRENT_TIMESTAMP' }] },
      ],
    }],
  };

  test('parseMappingsFromResponse extracts mappings from backend tablePairs', () => {
    const res = parseMappingsFromResponse(sampleBackendData);
    expect(res).toHaveLength(2);
    expect(res[0].source).toBe('orders.order_number');
    expect(res[0].target).toBe('ORDERS.ORDER_NO');
    expect(res[0].targetOnly).toBe(false);
    expect(res[1].source).toBeNull();
    expect(res[1].target).toBe('ORDERS.CREATED_AT');
    expect(res[1].targetOnly).toBe(true);
    expect(res[1].transforms[0].fn).toBe('CURRENT_TIMESTAMP');
  });

  test('extractTablesFromResponse extracts tables and columns', () => {
    const { sourceTables, targetTables } = extractTablesFromResponse(sampleBackendData);
    expect(sourceTables).toHaveLength(1);
    expect(sourceTables[0].tableName).toBe('orders');
    expect(sourceTables[0].columns[0].name).toBe('order_number');
    expect(targetTables).toHaveLength(1);
    expect(targetTables[0].tableName).toBe('ORDERS');
    expect(targetTables[0].columns[0].name).toBe('ORDER_NO');
  });

  test('buildSavePayload constructs PipelineTableRequest array', () => {
    const mappings = [
      { source: 'orders.order_number', target: 'ORDERS.ORDER_NO', transforms: [] },
      { source: null, target: 'ORDERS.CREATED_AT', targetOnly: true, defaultValue: 'NOW()', transforms: [{ fn: 'CURRENT_TIMESTAMP' }] },
    ];
    const sourceTables = [{ tableName: 'orders' }];
    const payload = buildSavePayload(mappings, {}, sourceTables);
    expect(payload).toHaveLength(1);
    expect(payload[0].sourceTable).toBe('orders');
    expect(payload[0].targetMappings[0].targetTable).toBe('ORDERS');
    expect(payload[0].targetMappings[0].columnMappings).toHaveLength(2);
    expect(payload[0].targetMappings[0].columnMappings[0].sourceColumn).toBe('order_number');
    expect(payload[0].targetMappings[0].columnMappings[0].targetColumn).toBe('ORDER_NO');
  });

  test('handles schema-qualified table names in buildSavePayload', () => {
    const mappings = [
      { source: 'public.customers.customer_id', target: 'CUSTOMERS.ID', transforms: [] },
      { source: null, target: 'CUSTOMERS.CREATED_AT', targetOnly: true, transforms: [] },
    ];
    const sourceTables = [{ tableName: 'public.customers' }];
    const payload = buildSavePayload(mappings, {}, sourceTables);
    expect(payload).toHaveLength(1);
    expect(payload[0].sourceTable).toBe('public.customers');
    expect(payload[0].targetMappings[0].targetTable).toBe('CUSTOMERS');
    expect(payload[0].targetMappings[0].columnMappings[0].sourceColumn).toBe('customer_id');
    expect(payload[0].targetMappings[0].columnMappings[0].targetColumn).toBe('ID');
    expect(payload[0].targetMappings[0].columnMappings[1].sourceColumn).toBeNull();
    expect(payload[0].targetMappings[0].columnMappings[1].targetColumn).toBe('CREATED_AT');
  });

  test('isMappingValidForTarget recognizes source, system values, and default values', () => {
    expect(isMappingValidForTarget({ target: 'T.C', source: 'S.C' })).toBe(true);
    expect(isMappingValidForTarget({ target: 'T.C', source: null, defaultValue: 'VAL' })).toBe(true);
    expect(isMappingValidForTarget({ target: 'T.C', source: null, transforms: [{ fn: 'CURRENT_TIMESTAMP' }] })).toBe(true);
    expect(isMappingValidForTarget({ target: 'T.C', source: null, transforms: [{ fn: 'STATIC_VALUE', args: 'CONST' }] })).toBe(true);
    // Invalid when no source, no default, and blank static value or no transforms
    expect(isMappingValidForTarget({ target: 'T.C', source: null, transforms: [{ fn: 'STATIC_VALUE', args: '   ' }] })).toBe(false);
    expect(isMappingValidForTarget({ target: 'T.C', source: null, transforms: [] })).toBe(false);
    expect(isMappingValidForTarget({ target: 'T.C', source: null })).toBe(false);
    expect(isMappingValidForTarget(null)).toBe(false);
  });
});
