import React from 'react';
import { FN_META } from '../../../constants/transformMeta';

/**
 * Grouped available functions picker and Java UDF trigger (<= 100 lines).
 */
export const TransformFunctionGrid = ({
  categories = {},
  nextInputType,
  onAddStep,
  onOpenUdfModal,
}) => (
  <div id="transform-function-grid">
    {/* Custom Java UDF Callout */}
    <div style={{ marginBottom: '16px', background: '#F4F2FF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CECBF6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#3C3489' }}>Custom Java UDF</div>
        <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '1px' }}>Execute custom row-level Java transformations</div>
      </div>
      <button
        type="button"
        id="btn-add-java-udf"
        onClick={() => onOpenUdfModal(null)}
        style={{ background: '#534AB7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
      >
        + Add Java UDF
      </button>
    </div>

    {/* Section Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <p style={{ fontSize: '12px', fontWeight: 500, color: '#6B6B6B' }}>Add transformation</p>
      <span style={{ fontSize: '10px', color: '#534AB7', background: '#EEEDFE', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
        Input type: {nextInputType}
      </span>
    </div>

    {/* Categories and Function Buttons */}
    {Object.entries(categories).map(([cat, fns]) => (
      <div key={cat} style={{ marginBottom: '8px' }}>
        <p style={{ fontSize: '10px', color: '#9B9B9B', marginBottom: '4px' }}>{cat}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {fns.map((fn) => (
            <div
              key={fn}
              onClick={() => onAddStep(fn)}
              title={FN_META[fn]?.desc}
              style={{ background: '#F7F7F5', border: '1px solid #E8E8E5', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EEEDFE'; e.currentTarget.style.borderColor = '#534AB7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F7F7F5'; e.currentTarget.style.borderColor = '#E8E8E5'; }}
            >
              <span style={{ fontSize: '10px' }}>+</span>
              <span>{fn}</span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default TransformFunctionGrid;
