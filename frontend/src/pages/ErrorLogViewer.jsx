import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiGuard, BarLoader, Button, Chip, ConfirmationModal, MetricCard, PageHeader } from '../components/common';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../constants/design';
import { FRBC, FRSC, FRWSC } from '../constants/layouts';
import { ERRORS } from '../constants/literals';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { errorApi } from '../services/api';
import { ForbiddenPage } from './ErrorPage';
import ErrorLogEntry from '../components/monitor/ErrorLogEntry';
import ErrorDetailDrawer from '../components/monitor/ErrorDetailDrawer';
import ErrorZeroState from '../components/monitor/ErrorZeroState';
import ErrorFilterEmptyState from '../components/monitor/ErrorFilterEmptyState';
import { exportFormats, downloadFile } from '../utils/errorExportUtils';

const ERROR_TYPE_COLORS = {
  TYPE_CAST_FAILED: 'error',
  NULL_CONSTRAINT: 'warning',
  PK_DUPLICATE: 'purple',
  WRITE_TIMEOUT: 'default',
};

/* ================================================================
   EXPORT DROPDOWN
   ================================================================ */
const ExportDropdown = ({ errors, pipelineName }) => {
  const [open, setOpen] = useState(false);

  const handleExport = (format) => {
    const config = exportFormats[format];
    if (!config) return;
    const content = config.serialize(errors, pipelineName);
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = (pipelineName || 'errors').replace(/[^a-zA-Z0-9-_]/g, '_');
    downloadFile(content, `${safeName}_errors_${timestamp}.${config.ext}`, config.mime);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <Button variant="secondary" onClick={() => setOpen(!open)}>
        <span style={{ ...FRSC, gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2.5 4L5 6.5 7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      </Button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 100,
            background: '#fff', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', minWidth: '180px', overflow: 'hidden',
          }}>
            {/* <div style={{ padding: '6px 12px', fontSize: '10px', color: COLORS.text.tertiary, borderBottom: `1px solid ${COLORS.border.light}` }}>
              Download as
            </div> */}
            {Object.entries(exportFormats).map(([key, config]) => (
              <div key={key}
                onClick={() => handleExport(key)}
                style={{ ...FRSC, gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: FONT.size.xs }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.background.secondary}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: '12px', width: '16px', textAlign: 'center', color: COLORS.text.secondary }}><i className={config.icon} /></span>
                <div>
                  <span style={{ fontWeight: FONT.weight.medium }}>{config.label}</span>
                  <span style={{ color: COLORS.text.tertiary, marginLeft: '6px' }}>(.{config.ext})</span>
                </div>
              </div>
            ))}
            {/* Future: external services section */}
            {/* <div style={{ height: '1px', background: COLORS.border.light, margin: '4px 0' }} />
            <div style={{ padding: '6px 12px', fontSize: '10px', color: COLORS.text.tertiary }}>Send to</div>
            <div style={{ ...FRSC, gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: FONT.size.xs, opacity: 0.5 }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.background.secondary}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '12px', width: '20px', textAlign: 'center' }}><i className="fa-solid fa-server" /></span>
              <div><span>Datadog</span><span style={{ color: COLORS.text.tertiary, marginLeft: '6px' }}>coming soon</span></div>
            </div> */}
          </div>
        </>
      )}
    </div>
  );
};

/* ================================================================
   MAIN PAGE
   ================================================================ */
const ErrorLogViewer = () => {
  const { hasPermission } = useAuth();
  const canViewPipeline = hasPermission('pipeline:view');
  const canViewErrors = hasPermission('monitor:view_errors');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterTable, setFilterTable] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [selectedError, setSelectedError] = useState(null);
  const { pipelineId } = useParams();
  const navigate = useNavigate();

  const fetchErrors = useCallback(() => {
    if (!canViewPipeline || !canViewErrors) {
      setLoading(false);
      return;
    }
    setLoading(true);
    errorApi.getByPipelineId(pipelineId, page, pageSize).then(res => {
      const raw = res.data;
      // Map API field names to frontend field names
      const mappedErrors = (raw.errors || []).map(e => ({
        id: e.id,
        type: e.errorType || e.type,
        sourceTable: e.sourceTable || e.tableName || e.table || '',
        targetTable: e.targetTable || '',
        chunk: e.chunkNumber ?? e.chunk ?? 0,
        row: e.rowNumber ?? e.row ?? 1,
        message: e.errorMessage || e.message || e.reason || '',
        sourceData: e.sourceRowData || e.sourceData,
        timestamp: e.createdAt || e.timestamp,
      }));
      const mappedTypes = (raw.errorsByType || raw.errorTypes || []).map(et => ({ type: et.type, count: et.count }));
      setData({ ...raw, errors: mappedErrors, errorTypes: mappedTypes });
      setError(null);
    }).catch(err => {
      setError(err);
    }).finally(() => {
      setLoading(false);
    });
  }, [pipelineId, page, pageSize, canViewPipeline, canViewErrors]);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  const allErrors = data?.errors || [];
  const totalErrors = data?.totalErrors || 0;
  const totalPages = Math.max(1, Math.ceil(totalErrors / pageSize));

  const filteredErrors = allErrors.filter(e => {
    const matchesSearch = !search || e.message?.toLowerCase().includes(search.toLowerCase()) || String(e.row).includes(search) || e.sourceTable?.toLowerCase().includes(search.toLowerCase());
    const matchesTable = filterTable === 'all' || e.sourceTable === filterTable;
    const matchesType = filterType === 'all' || e.type === filterType;
    return matchesSearch && matchesTable && matchesType;
  });

  const uniqueTables = [...new Set(allErrors.map(e => e.sourceTable).filter(Boolean))];
  const uniqueTypes = [...new Set(allErrors.map(e => e.type).filter(Boolean))];

  const [confirmClear, setConfirmClear] = useState(false);
  const notification = useNotification();

  const handleClear = async () => {
    try {
      await errorApi.clear(pipelineId);
      setData(prev => prev ? { ...prev, errors: [], totalErrors: 0, errorTypes: [] } : prev);
      setPage(0);
      notification.success('Error logs cleared successfully');
    } catch (e) {
      console.error('Failed to clear errors:', e);
      notification.error(e.message || 'Failed to clear error logs');
    } finally {
      setConfirmClear(false);
    }
  };

  const goToPage = (p) => {
    const clamped = Math.max(0, Math.min(p, totalPages - 1));
    setPage(clamped);
  };

  // Build page numbers to show (max 5 visible)
  const pageNumbers = [];
  const maxVisible = 5;
  let startPage = Math.max(0, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible);
  if (endPage - startPage < maxVisible) startPage = Math.max(0, endPage - maxVisible);
  for (let i = startPage; i < endPage; i++) pageNumbers.push(i);

  const startRow = page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, totalErrors);

  if (!canViewPipeline) {
    return (
      <ForbiddenPage
        missingPermission="pipeline:view"
        message="You don't have permission to view pipelines."
      />
    );
  }

  if (!canViewErrors) {
    return (
      <ForbiddenPage
        missingPermission="monitor:view_errors"
        message="You don't have permission to view error logs."
      />
    );
  }

  return (
    <ApiGuard
      error={error}
      loading={loading && !data}
      onRetry={fetchErrors}
      loadingComponent={
        <div>
          <BarLoader />
          <div style={{ padding: '60px', textAlign: 'center', color: COLORS.text.secondary }}>
            Loading error logs...
          </div>
        </div>
      }
    >
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
          <PageHeader
            breadcrumbs={[
              { label: data.pipelineName, onClick: () => navigate(`/pipelines/${pipelineId}/monitor`) },
              { label: ERRORS.title },
            ]}
            actions={
              <div style={{ ...FRSC, gap: SPACING.xs }}>
                <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                  {totalErrors} error{totalErrors !== 1 ? 's' : ''}
                </span>
                {totalErrors > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => setConfirmClear(true)}>Clear logs</Button>
                )}
                <ExportDropdown errors={filteredErrors} pipelineName={data.pipelineName} />
              </div>
            }
          />

          {/* Metrics */}
          <div style={{ ...FRSC, gap: SPACING.sm, marginBottom: SPACING.lg, flexShrink: 0 }}>
            <MetricCard
              label={ERRORS.totalErrors}
              value={totalErrors}
              color={totalErrors === 0 ? COLORS.status.successDark : COLORS.status.errorDark}
            />
            <MetricCard
              label={ERRORS.skipped}
              value={data.skipped || 0}
              color={totalErrors === 0 ? COLORS.status.successDark : COLORS.status.warningDark}
            />
            <MetricCard
              label={ERRORS.pipelineStopped}
              value={data.pipelineStopped || 0}
              color={totalErrors === 0 ? COLORS.status.successDark : COLORS.status.errorDark}
            />
            <MetricCard
              label={totalErrors === 0 ? 'DATA INTEGRITY' : ERRORS.errorRate}
              value={totalErrors === 0 ? '100%' : (data.errorRate || 0)}
              color={totalErrors === 0 ? COLORS.status.infoDark : undefined}
            />
          </div>

          {totalErrors === 0 ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: SPACING.md }}>
              <ErrorZeroState pipelineId={pipelineId} />
            </div>
          ) : (
            <>
              {/* Error type chips */}
              {data.errorTypes?.length > 0 && (
                <div style={{ marginBottom: SPACING.md, flexShrink: 0 }}>
                  <p style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: COLORS.text.secondary, marginBottom: SPACING.xs }}>
                    {ERRORS.errorsByType}
                  </p>
                  <div style={{ ...FRWSC, gap: '6px' }}>
                    {data.errorTypes.map(et => (
                      <Chip key={et.type}
                        label={`${et.type} (${et.count})`}
                        colorScheme={ERROR_TYPE_COLORS[et.type] || 'default'}
                        onClick={() => setFilterType(filterType === et.type ? 'all' : et.type)}
                        style={filterType === et.type ? { outline: `2px solid ${COLORS.brand.primary}` } : {}}
                      />
                    ))}
                    {filterType !== 'all' && (
                      <span onClick={() => setFilterType('all')} style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, cursor: 'pointer', textDecoration: 'underline' }}>Clear</span>
                    )}
                  </div>
                </div>
              )}

              {/* Search + filters */}
              <div style={{ ...FRSC, gap: SPACING.xs, marginBottom: SPACING.sm, flexShrink: 0 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ERRORS.searchPlaceholder}
                  style={{ flex: 1, padding: '7px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.sm }} />
                <select value={filterTable} onChange={e => setFilterTable(e.target.value)}
                  style={{ padding: '7px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.sm, background: '#fff' }}>
                  <option value="all">All tables</option>
                  {uniqueTables.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  style={{ padding: '7px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.sm, background: '#fff' }}>
                  <option value="all">All types</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Scrollable error list — fills remaining space */}
              <div style={{
                flex: 1, minHeight: 0, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md,
                overflow: 'auto', background: '#f8fafc', padding: SPACING.md,
              }}>
                {filteredErrors.length === 0 ? (
                  <ErrorFilterEmptyState onReset={() => { setSearch(''); setFilterTable('all'); setFilterType('all'); }} />
                ) : (
                  filteredErrors.map((error) => (
                    <ErrorLogEntry
                      key={error.id}
                      error={error}
                      onOpenDetails={(err) => setSelectedError(err)}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {/* Pagination — always visible at bottom */}
          {totalErrors > 0 && (
            <div style={{ ...FRBC, padding: `${SPACING.sm} 0`, flexShrink: 0 }}>
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                Showing {startRow}-{endRow} of {totalErrors} errors
              </span>
              <div style={{ ...FRSC, gap: '4px' }}>
                <Button variant="secondary" size="sm" onClick={() => goToPage(page - 1)}
                  style={page === 0 ? { opacity: 0.4, pointerEvents: 'none' } : {}}>Prev</Button>
                {startPage > 0 && <>
                  <Button variant="secondary" size="sm" onClick={() => goToPage(0)}>1</Button>
                  {startPage > 1 && <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, padding: '0 4px' }}>…</span>}
                </>}
                {pageNumbers.map(p => (
                  <Button key={p} variant={p === page ? 'primary' : 'secondary'} size="sm"
                    onClick={() => goToPage(p)}>{p + 1}</Button>
                ))}
                {endPage < totalPages && <>
                  {endPage < totalPages - 1 && <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, padding: '0 4px' }}>…</span>}
                  <Button variant="secondary" size="sm" onClick={() => goToPage(totalPages - 1)}>{totalPages}</Button>
                </>}
                <Button variant="secondary" size="sm" onClick={() => goToPage(page + 1)}
                  style={page >= totalPages - 1 ? { opacity: 0.4, pointerEvents: 'none' } : {}}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmClear}
        title="Clear Error Logs"
        message="Are you sure you want to clear all error logs for this pipeline? This action cannot be undone."
        color={COLORS.status.error}
        onClose={() => setConfirmClear(false)}
        actions={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setConfirmClear(false) },
          { label: 'Clear all errors', variant: 'danger', onClick: handleClear },
        ]}
      />

      {/* Detail Slider Drawer Modal */}
      <ErrorDetailDrawer
        error={selectedError}
        onClose={() => setSelectedError(null)}
      />
    </ApiGuard>
  );
};

export default ErrorLogViewer;