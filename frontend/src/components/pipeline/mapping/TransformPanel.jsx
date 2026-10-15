import React, { useMemo, useState } from 'react';
import { Button } from '../../common';
import UdfPickerModal from '../UdfPickerModal';
import { ALL_FUNCTIONS, FN_META } from '../../../constants/transformMeta';
import { checkTargetCompatibility, normalizeDataType, validateInputForType } from '../../../utils/typeValidation';
import { getSampleData } from '../../../utils/transformSimulator';
import TransformChainList from './TransformChainList';
import TransformFunctionGrid from './TransformFunctionGrid';
import TransformPanelHeader from './TransformPanelHeader';
import TransformPreviewBox from './TransformPreviewBox';

export const TransformPanel = ({ mapping, mappingIdx, sourceTables = [], targetTables = [], onApply, onClose }) => {
  const isSystemValue = mapping?.targetOnly;
  const [sT, sC] = (mapping?.source || '').split('.'); const [tT, tC] = (mapping?.target || '').split('.');
  const sourceCol = sourceTables.find((t) => t.tableName === sT)?.columns?.find((c) => c.name === sC);
  const targetCol = targetTables.find((t) => t.tableName === tT)?.columns?.find((c) => c.name === tC);
  const rawSourceType = sourceCol?.type || mapping?.sourceType || '';
  const rawTargetType = targetCol?.type || mapping?.targetType || '';
  const sourceNormType = isSystemValue ? 'SYSTEM' : normalizeDataType(rawSourceType);
  const targetNormType = normalizeDataType(rawTargetType);

  const [steps, setSteps] = useState((mapping?.transforms || []).map((t, i) => ({
    id: `s${i}`, fn: t.fn, args: t.args || '', start: '', end: '',
    ...(t.fn === 'SUBSTRING' && t.args ? (() => { const p = t.args.split(','); return { start: p[0] || '', end: p[1] || '' }; })() : {}),
    isSystemStep: i === 0 && !!FN_META[t.fn]?.isSystemValue,
  })));
  const [udfModalOpen, setUdfModalOpen] = useState(false);
  const [editingUdfStepId, setEditingUdfStepId] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const customValidation = useMemo(() => validateInputForType(customInput, sourceNormType), [customInput, sourceNormType]);

  const chainAnalysis = useMemo(() => {
    let currentType = isSystemValue ? (FN_META[steps[0]?.fn]?.outputType || 'STRING') : sourceNormType;
    const evaluatedSteps = steps.map((step, idx) => {
      if (step.isSystemStep) {
        const outType = FN_META[step.fn]?.outputType || 'STRING'; currentType = outType;
        return { ...step, inputType: 'NONE', outputType: outType, typeError: null };
      }
      const meta = FN_META[step.fn] || {}; const allowed = meta.inputTypes || ['ANY'];
      const ok = allowed.includes('ANY') || allowed.includes(currentType) || currentType === 'ANY';
      const outType = meta.outputType === 'SAME' ? currentType : (meta.outputType || currentType);
      const err = ok ? null : `${step.fn} requires ${allowed.join(' or ')}, but got ${currentType}`;
      currentType = outType; return { ...step, inputType: currentType, outputType: outType, typeError: err };
    });
    return { finalType: currentType, steps: evaluatedSteps };
  }, [steps, isSystemValue, sourceNormType]);

  const targetComp = useMemo(() => checkTargetCompatibility(chainAnalysis.finalType, targetNormType), [chainAnalysis.finalType, targetNormType]);
  const categories = useMemo(() => {
    const cats = {};
    ALL_FUNCTIONS.filter((fn) => FN_META[fn]?.inputTypes.some((it) => it === 'ANY' || it === chainAnalysis.finalType)).forEach((fn) => {
      const cat = FN_META[fn]?.category || 'Other'; (cats[cat] = cats[cat] || []).push(fn);
    });
    return cats;
  }, [chainAnalysis.finalType]);

  const defaultSamples = useMemo(() => isSystemValue ? [null, null, null] : getSampleData(sourceNormType, steps[0]?.fn), [sourceNormType, isSystemValue, steps]);
  const effectiveSamples = useMemo(() => isSystemValue ? [null, null, null].map((v) => ({ val: v, isCustom: false })) : (customInput.trim() ? [{ val: customInput, isCustom: true }] : []).concat(defaultSamples.map((v) => ({ val: v, isCustom: false }))), [isSystemValue, customInput, defaultSamples]);
  const effectiveSteps = steps.map((s) => ({ fn: s.fn, args: s.fn === 'SUBSTRING' ? `${s.start || '0'},${s.end || ''}` : s.args }));

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '500px', background: '#fff', borderLeft: '1px solid #E8E8E5', boxShadow: '-4px 0 16px rgba(0,0,0,.06)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <TransformPanelHeader isSystemValue={isSystemValue} mapping={mapping} rawSourceType={rawSourceType} rawTargetType={rawTargetType} onClose={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <TransformChainList steps={steps} chainAnalysis={chainAnalysis} getStepError={() => null} updateArgs={(id, args) => setSteps((p) => p.map((s) => s.id === id ? { ...s, args } : s))} updateSubstr={(id, f, v) => setSteps((p) => p.map((s) => s.id === id ? { ...s, [f]: v } : s))} removeStep={(id) => setSteps((p) => p.filter((s) => s.id !== id))} handleOpenUdfModal={(id) => { setEditingUdfStepId(id); setUdfModalOpen(true); }} sourceNormType={sourceNormType} />
        <TransformFunctionGrid categories={categories} nextInputType={chainAnalysis.finalType} onAddStep={(fn) => setSteps((p) => [...p, { id: `s${Date.now()}`, fn, args: '', start: '', end: '', isSystemStep: false }])} onOpenUdfModal={() => { setEditingUdfStepId(null); setUdfModalOpen(true); }} />
        <TransformPreviewBox isSystemValue={isSystemValue} sourceNormType={sourceNormType} customInput={customInput} setCustomInput={setCustomInput} customValidation={customValidation} effectiveSamples={effectiveSamples} effectiveSteps={effectiveSteps} chainAnalysis={chainAnalysis} steps={steps} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #E8E8E5' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { onApply(mappingIdx, effectiveSteps); onClose(); }}>Apply</Button>
      </div>
      {udfModalOpen && <UdfPickerModal targetColumn={mapping?.target?.split('.')?.[1] || mapping?.target || ''} sourceTables={sourceTables} onApply={(cfg) => { setSteps((p) => [...p, { id: `s${Date.now()}`, fn: 'UDF', args: JSON.stringify(cfg), start: '', end: '', isSystemStep: false }]); setUdfModalOpen(false); }} onClose={() => setUdfModalOpen(false)} />}
    </div>
  );
};

export default TransformPanel;
