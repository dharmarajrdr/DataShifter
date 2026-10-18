import React from 'react';
import { CloseIcon } from '../../layout/Icons';
import { FN_META } from '../../../constants/transformMeta';

/**
 * Ordered list of chained transformation steps (<= 100 lines).
 */
export const TransformChainList = ({
  steps = [],
  chainAnalysis,
  getStepError,
  updateArgs,
  updateSubstr,
  removeStep,
  handleOpenUdfModal,
  sourceNormType,
}) => {
  if (steps.length === 0) {
    return (
      <div style={{ border: '1px dashed #D4D4D0', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#9B9B9B', fontSize: '12px', marginBottom: '16px' }}>
        No functions. Direct passthrough of {sourceNormType}.
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #E8E8E5', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
      {chainAnalysis.steps.map((step, i) => {
        const meta = FN_META[step.fn] || {};
        const isLocked = step.isSystemStep;
        const stepErr = getStepError(step.id);
        const hasErr = !!step.typeError || !!stepErr;
        const clr = isLocked ? { bg: '#FEF3C7', text: '#854F0B' } : [{ bg: '#EEEDFE', text: '#3C3489' }, { bg: '#E1F5EE', text: '#085041' }, { bg: '#FAECE7', text: '#712B13' }][i % 3];
        const inputBorder = hasErr ? '1px solid #D85A30' : '1px solid #E8E8E5';

        return (
          <div key={step.id} style={{ borderBottom: i < steps.length - 1 ? '1px solid #E8E8E5' : 'none' }}>
            {i > 0 && <div style={{ padding: '2px 0 2px 32px', fontSize: '10px', color: '#9B9B9B', background: '#FAFAF9' }}>↓ then ({step.inputType})</div>}
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: hasErr ? '#FDF2F2' : isLocked ? '#FFFBEB' : '#F7F7F5', gap: '6px' }}>
              <span style={{ background: clr.bg, color: clr.text, fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>{isLocked ? <i className="fa-solid fa-gear" /> : i + 1}</span>
              <span style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'monospace' }}>{step.fn}</span>
              <span style={{ fontSize: '9px', color: '#6B6B6B', background: '#E8E8E5', padding: '1px 4px', borderRadius: '3px', fontFamily: 'monospace' }}>→ {step.outputType}</span>
              {step.fn === 'UDF' ? (() => {
                let parsed = {}; try { parsed = typeof step.args === 'string' ? JSON.parse(step.args) : (step.args || {}); } catch {}
                return (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#3C3489', fontFamily: 'monospace' }}>{parsed.methodName || 'apply'}(row)</span>
                    <button type="button" onClick={() => handleOpenUdfModal(step.id)} style={{ marginLeft: 'auto', background: '#fff', border: '1px solid #D4D4D0', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer', color: '#534AB7', fontWeight: 500 }}>Edit</button>
                  </div>
                );
              })() : meta.needsArgs === 'split' ? (
                <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                  <input value={step.start} onChange={(e) => updateSubstr(step.id, 'start', e.target.value)} placeholder="Start" type="number" min="0" style={{ width: '60px', padding: '2px 6px', border: inputBorder, borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }} />
                  <input value={step.end} onChange={(e) => updateSubstr(step.id, 'end', e.target.value)} placeholder="End" type="number" min="0" style={{ width: '60px', padding: '2px 6px', border: inputBorder, borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }} />
                </div>
              ) : meta.needsArgs ? (
                <input value={step.args} onChange={(e) => updateArgs(step.id, e.target.value)} placeholder={meta.argHint} disabled={isLocked && !meta.needsArgs} style={{ flex: 1, padding: '2px 6px', border: inputBorder, borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }} />
              ) : (
                <span style={{ fontSize: '10px', color: '#9B9B9B', flex: 1 }}>{meta.desc}</span>
              )}
              {isLocked ? (
                <span style={{ fontSize: '10px', color: '#D97706' }} title="System value"><i className="fa-solid fa-lock" /></span>
              ) : (
                <span onClick={() => removeStep(step.id)} style={{ cursor: 'pointer' }}><CloseIcon color="#9B9B9B" size={10} /></span>
              )}
            </div>
            {step.typeError && <div style={{ padding: '3px 8px 4px 32px', fontSize: '10px', color: '#A32D2D', background: '#FDF2F2', fontWeight: 500 }}>Type mismatch: {step.typeError}</div>}
            {stepErr && !step.typeError && <div style={{ padding: '2px 8px 4px 32px', fontSize: '10px', color: '#A32D2D', background: '#FDF2F2' }}>{stepErr}</div>}
          </div>
        );
      })}
    </div>
  );
};

export default TransformChainList;
