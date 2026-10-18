import React, { useState } from 'react';
import { Button } from '../../common';
import { CloseIcon } from '../../layout/Icons';

export const FILTER_OPS = [
  { value: 'EQUALS', label: '=', desc: 'Equal to', needsValue: true },
  { value: 'NOT_EQUALS', label: '≠', desc: 'Not equal to', needsValue: true },
  { value: 'GREATER_THAN', label: '>', desc: 'Greater than', needsValue: true },
  { value: 'LESS_THAN', label: '<', desc: 'Less than', needsValue: true },
  { value: 'GREATER_THAN_OR_EQUAL', label: '≥', desc: 'Greater or equal', needsValue: true },
  { value: 'LESS_THAN_OR_EQUAL', label: '≤', desc: 'Less or equal', needsValue: true },
  { value: 'IN', label: 'IN', desc: 'In list', needsValue: true, hint: 'USD,INR,EUR' },
  { value: 'NOT_IN', label: 'NOT IN', desc: 'Not in list', needsValue: true, hint: 'USD,INR,EUR' },
  { value: 'LIKE', label: 'LIKE', desc: 'Pattern (% wildcard)', needsValue: true, hint: '%pattern%' },
  { value: 'IS_NULL', label: 'IS NULL', desc: 'Is null', needsValue: false },
  { value: 'NOT_NULL', label: 'NOT NULL', desc: 'Is not null', needsValue: false },
];

/**
 * Filter slide-over panel for source tables (<= 100 lines).
 */
export const FilterPanel = ({ sourceTable, sourceColumns = [], existingFilters = [], onApply, onClose }) => {
  const [filters, setFilters] = useState(
    (existingFilters || []).map((f, i) => ({ id: `f${i}`, column: f.columnName, operator: f.operator, value: f.value || '', logical: f.logicalOperator || 'AND' }))
  );

  const addFilter = () => setFilters((p) => [...p, { id: `f${Date.now()}`, column: sourceColumns[0]?.name || '', operator: 'EQUALS', value: '', logical: 'AND' }]);
  const removeFilter = (id) => setFilters((p) => p.filter((f) => f.id !== id));
  const updateFilter = (id, field, val) => setFilters((p) => p.map((f) => (f.id === id ? { ...f, [field]: val } : f)));

  const handleApply = () => {
    const valid = filters.filter((f) => f.column && f.operator);
    onApply(sourceTable, valid.map((f, i) => ({
      columnName: f.column, operator: f.operator, value: f.value, logicalOperator: i < valid.length - 1 ? f.logical : null, filterOrder: i,
    })));
    onClose();
  };

  const previewSQL = filters.length === 0 ? 'No filters — all rows will be migrated' : 'WHERE ' + filters.map((f, i) => {
    const op = FILTER_OPS.find((o) => o.value === f.operator);
    const valPart = op?.needsValue === false ? '' : f.operator === 'IN' || f.operator === 'NOT_IN' ? ` (${f.value})` : ` '${f.value}'`;
    return `${i > 0 ? ` ${f.logical} ` : ''}${f.column} ${op?.label || f.operator}${valPart}`;
  }).join('');

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#fff', borderLeft: '1px solid #E8E8E5', boxShadow: '-4px 0 16px rgba(0,0,0,.06)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E8E8E5' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 500 }}>Source filter</p>
          <p style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '2px' }}>{sourceTable} — only matching rows will be migrated</p>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer' }}><CloseIcon /></span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {filters.length === 0 ? (
          <div style={{ border: '1px dashed #D4D4D0', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#9B9B9B', fontSize: '12px', marginBottom: '16px' }}>
            No filters. All rows from <strong>{sourceTable}</strong> will be migrated.
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            {filters.map((f, i) => {
              const opMeta = FILTER_OPS.find((o) => o.value === f.operator);
              return (
                <div key={f.id} style={{ marginBottom: '8px' }}>
                  {i > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                      <select value={f.logical} onChange={(e) => updateFilter(f.id, 'logical', e.target.value)} style={{ border: '1px solid #E8E8E5', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', color: '#534AB7', background: '#EEEDFE' }}>
                        <option value="AND">AND</option><option value="OR">OR</option>
                      </select>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px', background: '#F7F7F5', borderRadius: '8px', border: '1px solid #E8E8E5' }}>
                    <select value={f.column} onChange={(e) => updateFilter(f.id, 'column', e.target.value)} style={{ border: '1px solid #E8E8E5', borderRadius: '4px', padding: '4px 6px', fontSize: '11px', flex: 1 }}>
                      {sourceColumns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <select value={f.operator} onChange={(e) => updateFilter(f.id, 'operator', e.target.value)} style={{ border: '1px solid #E8E8E5', borderRadius: '4px', padding: '4px 6px', fontSize: '11px', width: '90px' }}>
                      {FILTER_OPS.map((op) => <option key={op.value} value={op.value}>{op.label} ({op.desc})</option>)}
                    </select>
                    {opMeta?.needsValue !== false && <input value={f.value} onChange={(e) => updateFilter(f.id, 'value', e.target.value)} placeholder={opMeta?.hint || 'value'} style={{ border: '1px solid #E8E8E5', borderRadius: '4px', padding: '4px 6px', fontSize: '11px', flex: 1, fontFamily: 'monospace' }} />}
                    <span onClick={() => removeFilter(f.id)} style={{ cursor: 'pointer' }}><CloseIcon color="#9B9B9B" size={10} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={addFilter} style={{ background: 'none', border: '1px dashed #534AB7', borderRadius: '8px', padding: '8px', width: '100%', fontSize: '12px', color: '#534AB7', cursor: 'pointer', marginBottom: '16px' }}>+ Add filter condition</button>
        <div style={{ background: '#1A1A1A', borderRadius: '8px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#E1F5EE' }}>SELECT * FROM {sourceTable}<br /><span style={{ color: '#85B7EB' }}>{previewSQL}</span></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #E8E8E5' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleApply}>Apply filters</Button>
      </div>
    </div>
  );
};

export default FilterPanel;
