import { useEffect, useMemo, useState } from 'react';
import { connectionApi } from '../../../services/api';
import DdlSliderDrawer from './DdlSliderDrawer';
import WizardStepEntitiesRow from './WizardStepEntitiesRow';

export const WizardStepEntities = ({ id = 'wizard-step-entities', config, setConfig, errors = {} }) => {
  const src = config.sourceAdapter || '';
  const tgt = config.targetAdapter || '';
  const isSourceCdc = ['oracle-trail', 'oracle-gg-reader', 'postgres-wal', 'postgres-wal-reader'].includes(src) || src.includes('wal') || src.includes('trail') || src.includes('gg');
  const isSourceDb = !isSourceCdc && (['oracle-jdbc', 'postgres-jdbc', 'postgres-reader', 'oracle-reader', 'spanner-reader', 'bigquery-reader', 'bigtable-reader'].includes(src) || src.includes('reader') || !src);
  const isTargetDb = ['postgres-writer', 'oracle-writer', 'spanner-writer', 'bigquery-writer', 'bigtable-writer'].includes(tgt) || (tgt.includes('writer') && !tgt.includes('kafka') && !tgt.includes('s3') && !tgt.includes('file') && !tgt.includes('snowflake'));

  const [sourceTables, setSourceTables] = useState([]);
  const [targetTables, setTargetTables] = useState([]);
  const [activeDdlIdx, setActiveDdlIdx] = useState(null);

  useEffect(() => {
    if (config.source) connectionApi.listTables(config.source).then((r) => setSourceTables(r.data || [])).catch(() => { });
    if (config.target) connectionApi.listTables(config.target).then((r) => setTargetTables(r.data || [])).catch(() => { });
  }, [config.source, config.target]);

  const pairs = config.entityPairs?.length
    ? config.entityPairs
    : [{ sourceEntity: '', targetEntity: '' }];

  const updatePair = (index, field, value) => {
    const next = [...pairs];
    next[index] = { ...next[index], [field]: value };
    setConfig({ ...config, entityPairs: next });
  };

  const addPair = () => setConfig({ ...config, entityPairs: [...pairs, { sourceEntity: '', targetEntity: '', sourceSchemaSql: '' }] });
  const removePair = (index) => setConfig({ ...config, entityPairs: pairs.filter((_, i) => i !== index) });

  const hasDuplicate = useMemo(() => {
    const seen = new Set();
    for (const p of pairs) {
      if (!p.sourceEntity?.trim() || !p.targetEntity?.trim()) continue;
      const k = `${p.sourceEntity.trim().toUpperCase()}:::${p.targetEntity.trim().toUpperCase()}`;
      if (seen.has(k)) return true;
      seen.add(k);
    }
    return false;
  }, [pairs]);

  return (
    <div id={id} className="wizard-step-entities-panel w-full py-2">
      <div id={`${id}-header`} className="mb-4 flex items-center justify-between">
        <div>
          <h3 id={`${id}-title`} className="text-base font-semibold text-slate-900">Configure Datasets &amp; Entity Pairing</h3>
          <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">Map source tables to destination tables. Supports 1:N, N:1, and N:N unique pair relationships.</p>
        </div>
        <button type="button" id={`${id}-add-btn`} onClick={addPair} className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all">
          <i className="fa-solid fa-plus text-xs" /><span>Add Entity</span>
        </button>
      </div>

      {errors.entityPairs && (
        <div id={`${id}-error`} className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation text-rose-600" />
          <span>{errors.entityPairs}</span>
        </div>
      )}

      {hasDuplicate && (
        <div id={`${id}-duplicate-warn`} className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-amber-600" />
          <span>Duplicate mapping detected. Each source and target pair must be unique.</span>
        </div>
      )}

      <div id={`${id}-list`} className="space-y-2.5">
        {pairs.map((pair, idx) => (
          <WizardStepEntitiesRow
            key={idx} id={id} idx={idx} pair={pair}
            onUpdate={updatePair} onRemove={removePair} canRemove={pairs.length > 1}
            isSourceDb={isSourceDb} isSourceCdc={isSourceCdc} isTargetDb={isTargetDb}
            sourceTables={sourceTables} targetTables={targetTables}
            onOpenDdl={(i) => setActiveDdlIdx(i)}
          />
        ))}
      </div>

      <DdlSliderDrawer
        isOpen={activeDdlIdx !== null}
        onClose={() => setActiveDdlIdx(null)}
        entityName={activeDdlIdx !== null ? pairs[activeDdlIdx]?.sourceEntity : ''}
        ddlSql={activeDdlIdx !== null ? pairs[activeDdlIdx]?.sourceSchemaSql : ''}
        onSave={(sql) => { if (activeDdlIdx !== null) updatePair(activeDdlIdx, 'sourceSchemaSql', sql); }}
      />
    </div>
  );
};

export default WizardStepEntities;
