import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiGuard, BarLoader, Loader, PageHeader } from '../../components/common';
import DragMappingBoard from '../../components/pipeline/DragMappingBoard';
import {
  FilterPanel, MappingFilterButtons, MappingHeaderActions,
  MappingStatsBar, MappingValidationErrors, TransformPanel,
} from '../../components/pipeline/mapping';
import useMappingState from '../../components/pipeline/mapping/useMappingState';
import { MAPPING as LIT } from '../../constants/literals';
import { useAuth } from '../../contexts/AuthContext';
import { ForbiddenPage } from '../ErrorPage';

const Backdrop = ({ onClick }) => (
  <div onClick={onClick} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.15)', zIndex: 99 }} />
);

/**
 * Column Mapping Page keeping exact existing board design (<= 100 lines).
 */
export const ColumnMappingPage = () => {
  const { pipelineId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const canView = auth.canViewPipeline ?? (auth.hasPermission ? auth.hasPermission('pipeline:view') : true);
  const canEdit = auth.canEditPipeline ?? (auth.hasPermission ? auth.hasPermission('pipeline:edit') : true);
  const [transformTarget, setTransformTarget] = useState(null);
  const [filterTarget, setFilterTarget] = useState(null);

  const mState = useMappingState(pipelineId, canView, canEdit);
  const { data, loading, error, mappings, filters, hasChanges, saving, validating, validateDisabled, valErrors, setValErrors, sourceTables, targetTables, handleChange, handleAutoMap, handleCancel, handleSave, handleValidate } = mState;

  if (!canView) return <ForbiddenPage missingPermission="pipeline:view" message="No permission to view pipelines." />;

  const unmappedReq = targetTables.reduce((n, tt) => {
    const mp = new Set(mappings.filter((m) => m.target.startsWith(tt.tableName + '.')).map((m) => m.target.split('.')[1]));
    return n + (tt.columns || []).filter((c) => !c.nullable && !mp.has(c.name)).length;
  }, 0);
  const totalFilters = Object.values(filters).flat().length;

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div><BarLoader /><Loader message="Loading mappings..." /></div>}>
      {data && (
        <div id="column-mapping-page">
          <PageHeader
            breadcrumbs={[{ label: data.pipelineName, onClick: () => navigate('/pipelines') }, { label: LIT.title }]}
            actions={<MappingHeaderActions status={data.status} hasChanges={hasChanges} canEdit={canEdit} validating={validating} saving={saving} validateDisabled={validateDisabled} onValidate={handleValidate} onAutoMap={handleAutoMap} onCancel={handleCancel} onSave={handleSave} />}
          />
          <MappingValidationErrors errors={valErrors} onDismiss={() => setValErrors([])} />
          <MappingStatsBar sourceTablesCount={sourceTables.length} targetTablesCount={targetTables.length} mappingsCount={mappings.length} unmappedReq={unmappedReq} totalFilters={totalFilters} hasChanges={hasChanges} />
          {sourceTables.length > 0 && targetTables.length > 0 ? (
            <DragMappingBoard sourceTables={sourceTables} targetTables={targetTables} mappings={mappings} onMappingsChange={handleChange} onMappingClick={(m, idx) => setTransformTarget({ mapping: m, idx })} onAddSystemValue={(t, c, fn, args) => handleChange([...mappings, { source: null, target: `${t}.${c}`, color: 'purple', transforms: [{ fn, args: args || '' }], targetOnly: true }])} onAddUdf={(t, c, cfg, pCol) => handleChange([...mappings, { source: pCol ? `${sourceTables[0]?.tableName}.${pCol}` : null, target: `${t}.${c}`, color: 'purple', transforms: [{ fn: 'UDF', args: JSON.stringify(cfg) }], targetOnly: !pCol }])} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#9B9B9B', border: '1px dashed #D4D4D0', borderRadius: '12px' }}>No tables configured.</div>
          )}
          <MappingFilterButtons sourceTables={sourceTables} filters={filters} onOpenFilter={(ft) => setFilterTarget(ft)} />
          {transformTarget && (<><Backdrop onClick={() => setTransformTarget(null)} /><TransformPanel mapping={transformTarget.mapping} mappingIdx={transformTarget.idx} sourceTables={sourceTables} targetTables={targetTables} onApply={(idx, newT) => handleChange(mappings.map((m, i) => i === idx ? { ...m, transforms: newT } : m))} onClose={() => setTransformTarget(null)} /></>)}
          {filterTarget && (<><Backdrop onClick={() => setFilterTarget(null)} /><FilterPanel sourceTable={filterTarget.tableName} sourceColumns={filterTarget.columns} existingFilters={filters[filterTarget.tableName]} onApply={(t, nf) => { mState.setFilters((p) => ({ ...p, [t]: nf })); mState.setHasChanges(true); }} onClose={() => setFilterTarget(null)} /></>)}
        </div>
      )}
    </ApiGuard>
  );
};

export default ColumnMappingPage;
