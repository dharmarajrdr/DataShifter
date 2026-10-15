import React from 'react';
import { simulateChain } from '../../../utils/transformSimulator';

/**
 * Live Simulation Preview Box with Custom Value Tester (<= 100 lines).
 */
export const TransformPreviewBox = ({
  isSystemValue,
  sourceNormType,
  customInput,
  setCustomInput,
  customValidation,
  effectiveSamples,
  effectiveSteps,
  chainAnalysis,
  steps,
}) => (
  <div id="transform-preview-box" style={{ marginTop: '16px' }}>
    <p style={{ fontSize: '12px', fontWeight: 500, color: '#6B6B6B', marginBottom: '8px' }}>
      Preview (Source type: {sourceNormType})
    </p>

    {!isSystemValue && (
      <div style={{ marginBottom: '8px', background: '#F7F7F5', padding: '6px 8px', borderRadius: '6px', border: customInput && !customValidation.ok ? '1px solid #D85A30' : '1px solid #E8E8E5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B6B6B' }}>Test custom {sourceNormType} value:</span>
          {customInput && <span onClick={() => setCustomInput('')} style={{ fontSize: '10px', color: '#534AB7', cursor: 'pointer' }}>Clear</span>}
        </div>
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder={`Enter test ${sourceNormType} value...`}
          style={{ width: '100%', padding: '4px 6px', fontSize: '11px', fontFamily: 'monospace', borderRadius: '4px', border: '1px solid #D4D4D0', boxSizing: 'border-box' }}
        />
        {customInput && !customValidation.ok && (
          <div style={{ fontSize: '10px', color: '#A32D2D', marginTop: '3px', fontWeight: 500 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }} />{customValidation.message}
          </div>
        )}
      </div>
    )}

    <div style={{ border: '1px solid #E8E8E5', borderRadius: '8px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#F7F7F5' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: '#6B6B6B' }}>{isSystemValue ? 'Row' : 'Input'}</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: '#6B6B6B' }}>Output ({chainAnalysis.finalType})</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: '#6B6B6B', width: '32%' }}>Status</th>
          </tr>
        </thead>
        <tbody style={{ fontFamily: 'monospace' }}>
          {effectiveSamples.map((sample, i) => {
            const val = sample.val;
            if (sample.isCustom && !customValidation.ok) {
              return (
                <tr key={i} style={{ borderTop: '1px solid #E8E8E5', background: '#FDF2F2' }}>
                  <td style={{ padding: '5px 8px', color: '#A32D2D', fontWeight: 600 }}>"{val}" <small>(custom)</small></td>
                  <td style={{ padding: '5px 8px', color: '#9B9B9B' }}>—</td>
                  <td style={{ padding: '5px 8px', fontSize: '10px', color: '#A32D2D' }}>Invalid {sourceNormType}</td>
                </tr>
              );
            }
            const chain = simulateChain(val, effectiveSteps, chainAnalysis);
            const last = chain.length > 0 ? chain[chain.length - 1] : { ok: true, val };
            const hasErr = chain.some((r) => !r.ok);
            const errMsg = chain.find((r) => !r.ok)?.err;
            const finalVal = hasErr ? (chain.find((r) => !r.ok)?.val ?? val) : (last?.val ?? val);
            return (
              <tr key={i} style={{ borderTop: '1px solid #E8E8E5', background: sample.isCustom ? '#EEEDFE' : undefined }}>
                <td style={{ padding: '5px 8px', color: sample.isCustom ? '#3C3489' : '#6B6B6B', fontWeight: sample.isCustom ? 600 : 400 }}>
                  {isSystemValue ? `Row ${i + 1}` : val === null ? <em style={{ color: '#9B9B9B' }}>null</em> : `"${val}"`}
                  {sample.isCustom && <small style={{ color: '#534AB7', marginLeft: '4px' }}>(test)</small>}
                </td>
                <td style={{ padding: '5px 8px', color: hasErr ? '#A32D2D' : '#1A1A1A', fontWeight: 500 }}>
                  {finalVal === null ? <em style={{ color: '#9B9B9B' }}>null</em> : steps.length === 0 ? `"${val ?? ''}"` : `"${finalVal}"`}
                </td>
                <td style={{ padding: '5px 8px', fontSize: '10px' }}>
                  {steps.length === 0 ? <span style={{ color: '#9B9B9B' }}>Passthrough</span> : hasErr ? (
                    <span style={{ color: '#A32D2D' }}>{errMsg}</span>
                  ) : (
                    <span style={{ color: '#0F6E56' }}>OK</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default TransformPreviewBox;
