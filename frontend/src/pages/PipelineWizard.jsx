import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { FRSC, FRBC, FCCC } from '../constants/layouts';
import { WIZARD } from '../constants/literals';
import { PageHeader, Button, Chip, SortableList, Loader } from '../components/common';
import CreateNamespaceModal from '../components/pipeline/CreateNamespaceModal';
import { namespaceApi, connectionApi, pipelineApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { ForbiddenPage } from './ErrorPage';

const StepIndicator = ({ steps, currentStep }) => (
  <div style={{ ...FRSC, gap: 0, padding: `0 ${SPACING.xxl}`, marginBottom: SPACING.sm }}>
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <div style={{ ...FCCC, gap: '6px', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: i <= currentStep ? COLORS.brand.primary : 'transparent', border: i <= currentStep ? 'none' : `2px solid ${i === currentStep + 1 ? COLORS.brand.primary : COLORS.border.medium}`, color: i <= currentStep ? '#fff' : (i === currentStep + 1 ? COLORS.brand.primary : COLORS.text.secondary), ...FCCC, fontSize: FONT.size.md, fontWeight: FONT.weight.medium }}>{i + 1}</div>
          <span style={{ fontSize: FONT.size.xs, fontWeight: i <= currentStep ? FONT.weight.medium : FONT.weight.regular, color: i <= currentStep ? COLORS.brand.primary : COLORS.text.secondary }}>{step}</span>
        </div>
        {i < steps.length - 1 && <div style={{ flex: 1, height: '2px', marginBottom: '18px', background: i < currentStep ? COLORS.brand.primary : COLORS.border.light }} />}
      </React.Fragment>
    ))}
  </div>
);

const FieldError = ({ message }) => message ? <p style={{ fontSize: FONT.size.xs, color: COLORS.status.errorDark, marginTop: '4px' }}>{message}</p> : null;

const StepBasics = ({ config, setConfig, namespaces, onCreateNamespace, errors }) => (
  <div style={{ maxWidth: '480px' }}>
    <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>Pipeline basics</h3>
    <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>Give your pipeline a name, description, and assign it to a namespace.</p>
    <div style={{ marginBottom: SPACING.md }}>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Pipeline name <span style={{ color: COLORS.status.error }}>*</span></label>
      <input value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })} style={{ width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${errors.name ? COLORS.status.error : COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box' }} placeholder="e.g., Orders migration" />
      <FieldError message={errors.name} />
    </div>
    <div style={{ marginBottom: SPACING.md }}>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Description</label>
      <textarea value={config.description} onChange={e => setConfig({ ...config, description: e.target.value })} rows={3} style={{ width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box', resize: 'vertical' }} placeholder="Describe what this pipeline does" />
    </div>
    <div>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Namespace</label>
      <div style={{ ...FRSC, gap: '6px', flexWrap: 'wrap' }}>
        {namespaces.map(ns => (
          <div key={ns.id} onClick={() => setConfig({ ...config, namespaceId: ns.id })} style={{ padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md, cursor: 'pointer', border: config.namespaceId === ns.id ? `2px solid ${ns.color || COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`, background: config.namespaceId === ns.id ? (ns.color || COLORS.brand.primary) + '15' : COLORS.background.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '2px', background: ns.color || COLORS.brand.primary }} />
            <span style={{ fontSize: FONT.size.sm, fontWeight: config.namespaceId === ns.id ? FONT.weight.medium : FONT.weight.regular, color: config.namespaceId === ns.id ? (ns.color || COLORS.brand.primary) : COLORS.text.primary }}>{ns.name}</span>
          </div>
        ))}
        <div onClick={onCreateNamespace} style={{ padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md, cursor: 'pointer', border: `1px dashed ${COLORS.brand.primary}`, background: COLORS.background.primary, display: 'flex', alignItems: 'center', gap: '4px' }} onMouseEnter={e => { e.currentTarget.style.background = COLORS.accent.purpleLight; }} onMouseLeave={e => { e.currentTarget.style.background = COLORS.background.primary; }}>
          <span style={{ fontSize: '14px', color: COLORS.brand.primary, lineHeight: 1 }}>+</span>
        </div>
      </div>
    </div>

    {/* Pipeline Mode Selection */}
    <div style={{ marginTop: SPACING.lg, marginBottom: SPACING.md }}>
      <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xs }}>
        Execution Mode <span style={{ color: COLORS.status.error }}>*</span>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
        <div
          data-testid="mode-card-batch"
          onClick={() => setConfig({ ...config, pipelineMode: 'BATCH' })}
          style={{
            padding: SPACING.sm,
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer',
            border: (config.pipelineMode || 'BATCH') === 'BATCH' ? `2px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`,
            background: (config.pipelineMode || 'BATCH') === 'BATCH' ? COLORS.accent.purpleLight : COLORS.background.primary,
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ ...FRBC, marginBottom: '4px' }}>
            <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: COLORS.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-layer-group" style={{ color: (config.pipelineMode || 'BATCH') === 'BATCH' ? COLORS.brand.primary : COLORS.text.secondary }} />
              Batch Migration
            </span>
            {(config.pipelineMode || 'BATCH') === 'BATCH' && (
              <span style={{ fontSize: '10px', color: COLORS.brand.primary, fontWeight: 600 }}>Active</span>
            )}
          </div>
          <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0, lineHeight: 1.4 }}>
            Full table copy using chunked batch readers. Best for initial loads.
          </p>
        </div>

        <div
          data-testid="mode-card-cdc"
          onClick={() => setConfig({ ...config, pipelineMode: 'CDC' })}
          style={{
            padding: SPACING.sm,
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer',
            border: config.pipelineMode === 'CDC' ? `2px solid #0D9488` : `1px solid ${COLORS.border.light}`,
            background: config.pipelineMode === 'CDC' ? '#F0FDFA' : COLORS.background.primary,
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ ...FRBC, marginBottom: '4px' }}>
            <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: COLORS.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-bolt" style={{ color: config.pipelineMode === 'CDC' ? '#0D9488' : COLORS.text.secondary }} />
              CDC Streaming
            </span>
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#0D9488', background: '#CCFBF1', padding: '1px 5px', borderRadius: BORDER_RADIUS.pill }}>
              Real-time
            </span>
          </div>
          <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0, lineHeight: 1.4 }}>
            Continuous capture from Oracle GoldenGate trail files / Postgres WAL.
          </p>
        </div>
      </div>
    </div>

    {/* CDC Specific Configuration */}
    {config.pipelineMode === 'CDC' && (
      <div
        data-testid="cdc-config-panel"
        style={{
          marginTop: SPACING.md,
          padding: SPACING.md,
          background: '#F0FDFA',
          border: '1px solid #99F6E4',
          borderRadius: BORDER_RADIUS.md,
        }}
      >
        <div style={{ ...FRBC, marginBottom: SPACING.xs }}>
          <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: '#0F766E', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-sliders" />
            CDC Stream Configuration
          </span>
          <span style={{ fontSize: '10px', color: '#0F766E', fontWeight: 600 }}>
            {config.cdcLogType === 'POSTGRES_WAL' ? 'PostgreSQL WAL' : 'Oracle Trail'}
          </span>
        </div>
        <p style={{ fontSize: FONT.size.xs, color: '#115E59', marginBottom: SPACING.sm, lineHeight: 1.4 }}>
          {config.cdcLogType === 'POSTGRES_WAL'
            ? 'Stream row-level mutations from PostgreSQL Write-Ahead Log (WAL) 16MB segments using LSN tracking.'
            : 'Capture row-level mutations from Oracle GoldenGate binary trail files using SCN tracking.'}
        </p>

        {/* Log Type Selection */}
        <div style={{ marginBottom: SPACING.sm }}>
          <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
            Source Log Format <span style={{ color: COLORS.status.error }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.xs }}>
            <div
              data-testid="logtype-oracle-trail"
              onClick={() => setConfig({
                ...config,
                cdcLogType: 'ORACLE_TRAIL',
                cdcFilePattern: (config.cdcFilePattern === '000000010000.*' || !config.cdcFilePattern) ? 'aa.*' : config.cdcFilePattern,
                cdcLogTypeManuallySet: true
              })}
              style={{
                padding: '6px 10px',
                borderRadius: BORDER_RADIUS.sm,
                cursor: 'pointer',
                border: (config.cdcLogType || 'ORACLE_TRAIL') === 'ORACLE_TRAIL' ? '2px solid #0D9488' : `1px solid ${COLORS.border.light}`,
                background: (config.cdcLogType || 'ORACLE_TRAIL') === 'ORACLE_TRAIL' ? '#fff' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="fa-solid fa-database" style={{ fontSize: '12px', color: (config.cdcLogType || 'ORACLE_TRAIL') === 'ORACLE_TRAIL' ? '#0D9488' : COLORS.text.secondary }} />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text.primary }}>Oracle Trail</div>
                <div style={{ fontSize: '9px', color: COLORS.text.secondary }}>GoldenGate SCN</div>
              </div>
            </div>

            <div
              data-testid="logtype-postgres-wal"
              onClick={() => setConfig({
                ...config,
                cdcLogType: 'POSTGRES_WAL',
                cdcFilePattern: (config.cdcFilePattern === 'aa.*' || !config.cdcFilePattern) ? '000000010000.*' : config.cdcFilePattern,
                cdcLogTypeManuallySet: true
              })}
              style={{
                padding: '6px 10px',
                borderRadius: BORDER_RADIUS.sm,
                cursor: 'pointer',
                border: config.cdcLogType === 'POSTGRES_WAL' ? '2px solid #0D9488' : `1px solid ${COLORS.border.light}`,
                background: config.cdcLogType === 'POSTGRES_WAL' ? '#fff' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="fa-solid fa-file-waveform" style={{ fontSize: '12px', color: config.cdcLogType === 'POSTGRES_WAL' ? '#0D9488' : COLORS.text.secondary }} />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.text.primary }}>PostgreSQL WAL</div>
                <div style={{ fontSize: '9px', color: COLORS.text.secondary }}>Write-Ahead Log LSN</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: SPACING.sm }}>
          <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
            {config.cdcLogType === 'POSTGRES_WAL' ? 'PostgreSQL WAL Directory Path' : 'Oracle Trail Directory Path'} <span style={{ color: COLORS.status.error }}>*</span>
          </label>
          <input
            data-testid="input-cdc-directory"
            value={config.cdcDirectoryPath || ''}
            onChange={e => setConfig({ ...config, cdcDirectoryPath: e.target.value })}
            placeholder={config.cdcLogType === 'POSTGRES_WAL' ? 'e.g. /var/lib/postgresql/data/pg_wal' : 'e.g. /u01/app/oracle/dirdat'}
            style={{
              width: '100%',
              padding: `${SPACING.xs} 10px`,
              border: `1px solid ${errors.cdcDirectoryPath ? COLORS.status.error : COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.sm,
              fontSize: FONT.size.sm,
              boxSizing: 'border-box',
              background: '#fff',
              fontFamily: 'monospace'
            }}
          />
          <FieldError message={errors.cdcDirectoryPath} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm, marginBottom: SPACING.sm }}>
          <div>
            <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
              File Pattern
            </label>
            <input
              data-testid="input-cdc-pattern"
              value={config.cdcFilePattern || (config.cdcLogType === 'POSTGRES_WAL' ? '000000010000.*' : 'aa.*')}
              onChange={e => setConfig({ ...config, cdcFilePattern: e.target.value })}
              placeholder={config.cdcLogType === 'POSTGRES_WAL' ? 'e.g. 000000010000.*' : 'e.g. aa.*'}
              style={{
                width: '100%',
                padding: `${SPACING.xs} 10px`,
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.sm,
                fontSize: FONT.size.sm,
                boxSizing: 'border-box',
                background: '#fff',
                fontFamily: 'monospace'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: FONT.size.xs, fontWeight: 500, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
              {config.cdcLogType === 'POSTGRES_WAL' ? 'Starting LSN (Optional)' : 'Starting SCN (Optional)'}
            </label>
            <input
              data-testid="input-cdc-scn"
              value={config.cdcStartingScn || ''}
              onChange={e => setConfig({ ...config, cdcStartingScn: e.target.value })}
              placeholder={config.cdcLogType === 'POSTGRES_WAL' ? 'e.g. 0/3D7E5D8 (empty for snapshot)' : 'e.g. 1847291048 (empty for snapshot)'}
              style={{
                width: '100%',
                padding: `${SPACING.xs} 10px`,
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.sm,
                fontSize: FONT.size.sm,
                boxSizing: 'border-box',
                background: '#fff',
                fontFamily: 'monospace'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
          <div>
            <label style={{ fontSize: '11px', color: COLORS.text.secondary, display: 'block', marginBottom: '2px' }}>
              Flush Interval (ms)
            </label>
            <input
              data-testid="input-cdc-flush-interval"
              type="number"
              min="50"
              max="10000"
              step="50"
              value={config.cdcFlushIntervalMs ?? 200}
              onChange={e => setConfig({ ...config, cdcFlushIntervalMs: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.sm,
                fontSize: FONT.size.xs,
                boxSizing: 'border-box',
                background: '#fff'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: COLORS.text.secondary, display: 'block', marginBottom: '2px' }}>
              Micro-batch Size (events)
            </label>
            <input
              data-testid="input-cdc-batch-size"
              type="number"
              min="10"
              max="10000"
              step="50"
              value={config.cdcBatchSize ?? 500}
              onChange={e => setConfig({ ...config, cdcBatchSize: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.sm,
                fontSize: FONT.size.xs,
                boxSizing: 'border-box',
                background: '#fff'
              }}
            />
          </div>
        </div>
      </div>
    )}
  </div>
);

const StepConnections = ({ config, setConfig, connections, errors }) => {
  const connectedList = connections.filter(c => c.status === 'CONNECTED');
  const handleSelect = (role, connId) => setConfig({ ...config, [role]: config[role] === connId ? '' : connId });
  return (
    <div>
      <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>Select connections</h3>
      <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>Choose source and target database connections.</p>
      {connectedList.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: COLORS.text.tertiary, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.lg }}>No connected databases found.</div>}
      <div style={{ ...FRSC, gap: SPACING.lg, alignItems: 'flex-start' }}>
        {['source', 'target'].map(role => (
          <div key={role} style={{ flex: 1 }}>
            <label style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xs, textTransform: 'capitalize' }}>{role} connection <span style={{ color: COLORS.status.error }}>*</span></label>
            {connectedList.map(conn => {
              const isSelected = config[role] === conn.id;
              return (
                <div key={conn.id} onClick={() => handleSelect(role, conn.id)} style={{ padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xs, border: isSelected ? `2px solid ${COLORS.brand.primary}` : `1px solid ${COLORS.border.light}`, background: isSelected ? COLORS.accent.purpleLight : COLORS.background.primary, cursor: 'pointer' }}>
                  <div style={{ ...FRBC }}><div><p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>{conn.name}</p><p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>{conn.dbType} — {conn.host}</p></div>{isSelected && <span style={{ fontSize: '10px', color: COLORS.brand.primary, fontWeight: FONT.weight.medium }}>Selected</span>}</div>
                </div>
              );
            })}
            <FieldError message={errors[role]} />
          </div>
        ))}
      </div>
      {config.source && config.target && config.source === config.target && <div style={{ marginTop: SPACING.sm, padding: `${SPACING.xs} 10px`, background: COLORS.status.infoLight, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, color: COLORS.status.infoText }}>Same connection for source and target — migrating within the same database.</div>}
    </div>
  );
};

const TablePickerPanel = ({ label, accent, allTables, selectedTables, onAdd, onRemove, onAddAll, onRemoveAll, loading, emptyMessage, errors, errorKey }) => {
  const [search, setSearch] = useState('');
  const available = (allTables || []).filter(t => !selectedTables.includes(t) && t.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: accent, marginBottom: '6px' }}>{label}</p>
      {loading && <Loader variant="spinner" size="sm" height="80px" message="Fetching tables..." />}
      {!loading && allTables.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: COLORS.text.tertiary, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs }}>{emptyMessage}</div>}
      {!loading && allTables.length > 0 && (
        <>
          <div style={{ marginBottom: SPACING.sm }}>
            <div style={{ ...FRBC, marginBottom: '4px' }}>
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>Available ({available.length})</span>
              {available.length > 0 && <button onClick={onAddAll} style={{ background: 'none', border: 'none', fontSize: FONT.size.xs, color: COLORS.brand.primary, cursor: 'pointer' }}>Add all</button>}
            </div>
            <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, padding: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', padding: '5px 8px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.sm, fontSize: FONT.size.xs, marginBottom: '4px', boxSizing: 'border-box' }} />
              {available.length === 0 && <div style={{ padding: '8px', fontSize: FONT.size.xs, color: COLORS.text.tertiary, textAlign: 'center' }}>{search ? 'No match' : 'All added'}</div>}
              {available.map(t => (
                <div key={t} onClick={() => onAdd(t)} style={{ ...FRBC, padding: '4px 8px', fontSize: FONT.size.xs, color: COLORS.text.secondary, borderRadius: BORDER_RADIUS.sm, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = COLORS.background.secondary} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{t}</span><span style={{ fontSize: '16px', color: COLORS.text.tertiary }}>+</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...FRBC, marginBottom: '4px' }}>
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>Selected ({selectedTables.length})</span>
              {selectedTables.length > 0 && <button onClick={onRemoveAll} style={{ background: 'none', border: 'none', fontSize: FONT.size.xs, color: COLORS.status.errorDark, cursor: 'pointer' }}>Clear</button>}
            </div>
            {selectedTables.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: COLORS.text.tertiary, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs }}>Click tables above to add</div>
            ) : (
              <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, maxHeight: '180px', overflowY: 'auto' }}>
                {selectedTables.map((t, i) => (
                  <div key={t} style={{ ...FRBC, padding: '5px 10px', fontSize: FONT.size.xs, borderTop: i > 0 ? `1px solid ${COLORS.border.light}` : 'none' }}>
                    <span style={{ fontWeight: FONT.weight.medium }}>{t}</span>
                    <span onClick={() => onRemove(t)} style={{ cursor: 'pointer', color: COLORS.text.tertiary, fontSize: '14px' }}>×</span>
                  </div>
                ))}
              </div>
            )}
            <FieldError message={errors?.[errorKey]} />
          </div>
        </>
      )}
    </div>
  );
};

const StepTables = ({ config, setConfig, sourceTables, targetTables, loadingSourceTables, loadingTargetTables, errors }) => (
  <div>
    <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>Select tables</h3>
    <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>Choose source and target tables involved in this migration. Column mapping is configured after creation.</p>
    <div style={{ ...FRSC, gap: SPACING.lg, alignItems: 'flex-start' }}>
      <TablePickerPanel label="Source tables" accent={COLORS.accent.purpleText} allTables={sourceTables} selectedTables={config.selectedSourceTables}
        onAdd={t => setConfig({ ...config, selectedSourceTables: [...config.selectedSourceTables, t] })}
        onRemove={t => setConfig({ ...config, selectedSourceTables: config.selectedSourceTables.filter(x => x !== t) })}
        onAddAll={() => setConfig({ ...config, selectedSourceTables: [...config.selectedSourceTables, ...sourceTables.filter(t => !config.selectedSourceTables.includes(t))] })}
        onRemoveAll={() => setConfig({ ...config, selectedSourceTables: [] })}
        loading={loadingSourceTables} emptyMessage={config.source ? 'No tables found.' : 'Select source connection first.'} errors={errors} errorKey="selectedSourceTables" />
      <div style={{ ...FCCC, paddingTop: '40px', flexShrink: 0, color: COLORS.text.tertiary }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke={COLORS.text.tertiary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <TablePickerPanel label="Target tables" accent="#085041" allTables={targetTables} selectedTables={config.selectedTargetTables}
        onAdd={t => setConfig({ ...config, selectedTargetTables: [...config.selectedTargetTables, t] })}
        onRemove={t => setConfig({ ...config, selectedTargetTables: config.selectedTargetTables.filter(x => x !== t) })}
        onAddAll={() => setConfig({ ...config, selectedTargetTables: [...config.selectedTargetTables, ...targetTables.filter(t => !config.selectedTargetTables.includes(t))] })}
        onRemoveAll={() => setConfig({ ...config, selectedTargetTables: [] })}
        loading={loadingTargetTables} emptyMessage={config.target ? 'No tables found.' : 'Select target connection first.'} errors={errors} errorKey="selectedTargetTables" />
    </div>
    {(config.selectedSourceTables.length > 0 || config.selectedTargetTables.length > 0) && (
      <div style={{ marginTop: SPACING.md, padding: `${SPACING.xs} ${SPACING.md}`, background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
        {config.selectedSourceTables.length} source and {config.selectedTargetTables.length} target table{config.selectedTargetTables.length !== 1 ? 's' : ''} selected. Column mapping configured after creation.
      </div>
    )}
  </div>
);

const StepMapping = () => (
  <div style={{ ...FCCC, padding: SPACING.xxxl, color: COLORS.text.secondary }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: COLORS.brand.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 9h6M3 15h6M15 9h6M15 15h6M9 9l6 6M9 15l6-6" stroke={COLORS.brand.primary} strokeWidth="1.5" strokeLinecap="round" /></svg>
    </div>
    <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.xs, color: COLORS.text.primary }}>Column mapping</p>
    <p style={{ fontSize: FONT.size.md, textAlign: 'center', maxWidth: '440px', lineHeight: 1.5 }}>
      After creating the pipeline, map columns from source to target tables on the mapping board. Supports 1:1, 1:N, and N:1 patterns — any source column can map to any target column across tables.
    </p>
  </div>
);

const StepReview = ({ config, namespaces, connections }) => {
  const source = connections.find(c => c.id === config.source);
  const target = connections.find(c => c.id === config.target);
  const ns = namespaces.find(n => n.id === config.namespaceId);
  const isCdc = config.pipelineMode === 'CDC';
  return (
    <div style={{ maxWidth: '560px' }}>
      <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, marginBottom: SPACING.lg }}>Review pipeline</h3>
      {[
        ['Name', config.name],
        ['Description', config.description || '(none)'],
        ['Namespace', ns?.name || 'Default'],
        ['Execution Mode', isCdc ? 'CDC Streaming (Continuous)' : 'Batch Migration (Snapshot)'],
        ...(isCdc ? [
          ['Log Format', config.cdcLogType === 'POSTGRES_WAL' ? 'PostgreSQL WAL' : 'Oracle GoldenGate Trail'],
          [config.cdcLogType === 'POSTGRES_WAL' ? 'WAL Directory' : 'Trail Directory', config.cdcDirectoryPath || '—'],
          ['File Pattern', config.cdcFilePattern || (config.cdcLogType === 'POSTGRES_WAL' ? '000000010000.*' : 'aa.*')],
          [config.cdcLogType === 'POSTGRES_WAL' ? 'Starting LSN' : 'Starting SCN', config.cdcStartingScn ? config.cdcStartingScn : `Auto-detected from snapshot ${config.cdcLogType === 'POSTGRES_WAL' ? 'LSN' : 'SCN'}`],
          ['Micro-Batching', `${config.cdcBatchSize || 500} events / ${config.cdcFlushIntervalMs || 200}ms`],
        ] : []),
        ['Source', source ? `${source.name} (${source.dbType})` : '—'],
        ['Target', target ? `${target.name} (${target.dbType})` : '—'],
      ].map(([l, v]) => (
        <div key={l} style={{ ...FRSC, gap: SPACING.md, marginBottom: SPACING.sm, fontSize: FONT.size.md }}><span style={{ width: '140px', color: COLORS.text.secondary, flexShrink: 0 }}>{l}</span><span style={{ fontWeight: FONT.weight.medium }}>{v}</span></div>
      ))}
      <div style={{ marginTop: SPACING.md }}><p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs }}>Source tables ({config.selectedSourceTables.length}):</p><div style={{ ...FRSC, gap: '4px', flexWrap: 'wrap' }}>{config.selectedSourceTables.map(t => <Chip key={t} label={t} colorScheme="purple" />)}</div></div>
      <div style={{ marginTop: SPACING.sm }}><p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs }}>Target tables ({config.selectedTargetTables.length}):</p><div style={{ ...FRSC, gap: '4px', flexWrap: 'wrap' }}>{config.selectedTargetTables.map(t => <Chip key={t} label={t} colorScheme="teal" />)}</div></div>
    </div>
  );
};

const validateStep = (step, config) => {
  const e = {};
  switch (step) {
    case 0:
      if (!config.name.trim()) e.name = 'Required';
      else if (config.name.trim().length < 3) e.name = 'Min 3 characters';
      if (config.pipelineMode === 'CDC' && (!config.cdcDirectoryPath || !config.cdcDirectoryPath.trim())) {
        e.cdcDirectoryPath = `${config.cdcLogType === 'POSTGRES_WAL' ? 'WAL' : 'Trail'} directory path is required for CDC mode`;
      }
      break;
    case 1: if (!config.source) e.source = 'Select source'; if (!config.target) e.target = 'Select target'; break;
    case 2: if (!config.selectedSourceTables.length) e.selectedSourceTables = 'Select at least one source table'; if (!config.selectedTargetTables.length) e.selectedTargetTables = 'Select at least one target table'; break;
    default: break;
  }
  return e;
};

const PipelineWizard = () => {
  const { hasPermission } = useAuth();
  const canViewPipeline = hasPermission('pipeline:view');
  const canCreatePipeline = hasPermission('pipeline:create');
  const [step, setStep] = useState(0);
  const [namespaces, setNamespaces] = useState([]);
  const [connections, setConnections] = useState([]);
  const [sourceTables, setSourceTables] = useState([]);
  const [targetTables, setTargetTables] = useState([]);
  const [loadingSourceTables, setLoadingSourceTables] = useState(false);
  const [loadingTargetTables, setLoadingTargetTables] = useState(false);
  const [showCreateNs, setShowCreateNs] = useState(false);
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [config, setConfig] = useState({
    name: '',
    description: '',
    namespaceId: '',
    source: '',
    target: '',
    selectedSourceTables: [],
    selectedTargetTables: [],
    pipelineMode: 'BATCH',
    cdcLogType: 'ORACLE_TRAIL',
    cdcDirectoryPath: '',
    cdcFilePattern: 'aa.*',
    cdcStartingScn: '',
    cdcFlushIntervalMs: 200,
    cdcBatchSize: 500,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!canViewPipeline || !canCreatePipeline) return;
    namespaceApi.getAll().then(res => { const l = res.data || []; setNamespaces(l); const d = l.find(n => n.name === 'Default'); if (d) setConfig(p => ({ ...p, namespaceId: d.id })); });
    connectionApi.getAll().then(res => setConnections(res.data || []));
  }, [canViewPipeline, canCreatePipeline]);

  useEffect(() => {
    if (!config.source) { setSourceTables([]); return; }
    setLoadingSourceTables(true); setSourceTables([]);
    setConfig(p => {
      const srcConn = connections.find(c => c.id === config.source);
      let nextLogType = p.cdcLogType;
      let nextPattern = p.cdcFilePattern;
      if (!p.cdcLogTypeManuallySet && srcConn) {
        if (srcConn.dbType === 'POSTGRESQL') {
          nextLogType = 'POSTGRES_WAL';
          if (!p.cdcFilePattern || p.cdcFilePattern === 'aa.*') nextPattern = '000000010000.*';
        } else if (srcConn.dbType === 'ORACLE') {
          nextLogType = 'ORACLE_TRAIL';
          if (!p.cdcFilePattern || p.cdcFilePattern === '000000010000.*') nextPattern = 'aa.*';
        }
      }
      return { ...p, selectedSourceTables: [], cdcLogType: nextLogType, cdcFilePattern: nextPattern };
    });
    connectionApi.listTables(config.source).then(r => setSourceTables(r.data || [])).catch(() => setSourceTables([])).finally(() => setLoadingSourceTables(false));
  }, [config.source, connections]);

  useEffect(() => {
    if (!config.target) { setTargetTables([]); return; }
    setLoadingTargetTables(true); setTargetTables([]);
    setConfig(p => ({ ...p, selectedTargetTables: [] }));
    connectionApi.listTables(config.target).then(r => setTargetTables(r.data || [])).catch(() => setTargetTables([])).finally(() => setLoadingTargetTables(false));
  }, [config.target]);

  useEffect(() => { setErrors({}); }, [config.name, config.source, config.target, config.selectedSourceTables.length, config.selectedTargetTables.length, config.pipelineMode, config.cdcDirectoryPath]);

  const handleNamespaceCreated = (ns) => { setNamespaces(p => [...p, ns]); setConfig(p => ({ ...p, namespaceId: ns.id })); };
  const handleNext = () => { const e = validateStep(step, config); if (Object.keys(e).length) { setErrors(e); return; } setErrors({}); setStep(step + 1); };

  const notification = useNotification();

  const handleCreate = async () => {
    setCreating(true);
    try {
      const isCdc = config.pipelineMode === 'CDC';
      const payload = {
        name: config.name.trim(), description: config.description.trim(),
        namespaceId: config.namespaceId || null,
        sourceConnectionId: config.source, targetConnectionId: config.target,
        sourceTables: config.selectedSourceTables,
        targetTables: config.selectedTargetTables,
        tables: config.selectedSourceTables.map((t, i) => ({ sourceTable: t, executionOrder: i })),
        pipelineMode: config.pipelineMode || 'BATCH',
        cdcLogType: isCdc ? (config.cdcLogType || 'ORACLE_TRAIL') : null,
        cdcDirectoryPath: isCdc ? config.cdcDirectoryPath?.trim() : null,
        cdcFilePattern: isCdc ? (config.cdcFilePattern?.trim() || (config.cdcLogType === 'POSTGRES_WAL' ? '000000010000.*' : 'aa.*')) : null,
        cdcStartingScn: isCdc ? (config.cdcStartingScn?.trim() || null) : null,
        cdcFlushIntervalMs: isCdc ? Number(config.cdcFlushIntervalMs || 200) : null,
        cdcBatchSize: isCdc ? Number(config.cdcBatchSize || 500) : null,
      };
      const res = await pipelineApi.create(payload);
      notification.success(`Pipeline "${config.name.trim()}" created successfully!`);
      navigate(res.data?.id ? `/pipelines/${res.data.id}/mapping` : '/pipelines');
    } catch (err) {
      setErrors({ create: err.message || 'Failed' });
      notification.error(err.message || 'Failed to create pipeline');
    } finally { setCreating(false); }
  };

  const STEPS = [
    <StepBasics config={config} setConfig={setConfig} namespaces={namespaces} onCreateNamespace={() => setShowCreateNs(true)} errors={errors} />,
    <StepConnections config={config} setConfig={setConfig} connections={connections} errors={errors} />,
    <StepTables config={config} setConfig={setConfig} sourceTables={sourceTables} targetTables={targetTables} loadingSourceTables={loadingSourceTables} loadingTargetTables={loadingTargetTables} errors={errors} />,
    <StepMapping />,
    <StepReview config={config} namespaces={namespaces} connections={connections} />,
  ];

  if (!canViewPipeline) {
    return (
      <ForbiddenPage
        missingPermission="pipeline:view"
        message="You don't have permission to view pipelines."
      />
    );
  }

  if (!canCreatePipeline) {
    return (
      <ForbiddenPage
        missingPermission="pipeline:create"
        message="You don't have permission to create pipelines."
      />
    );
  }

  return (
    <div>
      <PageHeader title="Create new pipeline" />
      <div style={{ background: COLORS.background.primary, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.lg, paddingLeft: SPACING.xl, paddingRight: SPACING.xl, width: '75%', height: 'calc(90vh - 40px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
        <div>
          <div style={{ position: 'sticky', top: 0, background: COLORS.background.primary, zIndex: 1, paddingTop: SPACING.xxxl, paddingBottom: SPACING.md }}>
            <StepIndicator steps={WIZARD.steps} currentStep={step} />
          </div>
          <div style={{ minHeight: '300px' }}>{STEPS[step]}</div>
        </div>
        <div style={{ ...FRBC, paddingBottom: SPACING.lg, paddingTop: SPACING.md, borderTop: `1px solid ${COLORS.border.light}`, position: 'sticky', bottom: 0, background: COLORS.background.primary }}>
          <Button variant="secondary" onClick={() => step > 0 ? setStep(step - 1) : navigate('/pipelines')}>{step === 0 ? 'Cancel' : WIZARD.back}</Button>
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            {errors.create && <span style={{ fontSize: FONT.size.xs, color: COLORS.status.errorDark, marginRight: SPACING.xs }}>{errors.create}</span>}
            {step < STEPS.length - 1 ? <Button onClick={handleNext}>Next: {WIZARD.steps[step + 1]}</Button> : <Button onClick={handleCreate} style={creating ? { opacity: 0.6 } : {}}>{creating ? 'Creating...' : WIZARD.create}</Button>}
          </div>
        </div>
      </div>
      {showCreateNs && <CreateNamespaceModal onClose={() => setShowCreateNs(false)} onCreated={handleNamespaceCreated} />}
    </div>
  );
};

export default PipelineWizard;