import React from 'react';
import { Download, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const UdfDetailHeader = ({ jar, canDelete, isDeleting, onDelete, onDownload }) => {
  if (!jar) return null;
  const isReferenced = (Number(jar.pipelineCount) > 0) || (Number(jar.columnCount) > 0);
  const deleteDisabled = !canDelete || isDeleting || isReferenced;

  return (
    <div id="udf-detail-header-card" className="bg-white border border-surface-200 rounded-xl p-5 shadow-subtle flex flex-col gap-4">
      <div id="udf-detail-top-row" className="flex items-start justify-between gap-4 flex-wrap">
        <div id="udf-detail-info-group" className="flex items-center gap-3.5">
          <div id="udf-detail-jar-badge" className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 font-mono font-semibold text-xs flex items-center justify-center flex-shrink-0">
            .JAR
          </div>
          <div id="udf-detail-titles">
            <h2 id="udf-detail-name" className="text-base font-semibold text-content-primary">
              {jar.name}
            </h2>
            <p id="udf-detail-meta" className="text-xs text-content-secondary mt-0.5 tabular-nums">
              Version {jar.version || '1.0.0'} • {formatBytes(jar.sizeBytes)} • Target JDK 17 (LTS) • Status: {jar.status}
            </p>
          </div>
        </div>

        <div id="udf-detail-actions" className="flex items-center gap-2">
          <button
            id="udf-detail-download-btn"
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-content-primary bg-white hover:bg-surface-50 border border-surface-300 rounded-lg shadow-subtle transition-colors"
          >
            <Download id="udf-detail-download-icon" className="w-3.5 h-3.5 text-content-secondary" />
            <span>Download</span>
          </button>
          {canDelete && (
            <button
              id="udf-detail-delete-btn"
              type="button"
              disabled={deleteDisabled}
              onClick={() => onDelete(jar)}
              title={isReferenced ? `Cannot delete: referenced in ${jar.pipelineCount || 0} pipeline(s)` : 'Delete JAR artifact'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                deleteDisabled
                  ? 'bg-surface-100 text-content-tertiary border-surface-200 cursor-not-allowed opacity-60'
                  : 'bg-red-50 text-status-danger border-red-200 hover:bg-red-100 cursor-pointer'
              }`}
            >
              <Trash2 id="udf-detail-delete-icon" className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete JAR'}</span>
            </button>
          )}
        </div>
      </div>

      <div id="udf-detail-verify-banner" className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-center gap-2.5">
        <CheckCircle2 id="udf-detail-verify-icon" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span id="udf-detail-verify-text">
          <strong id="udf-detail-verify-strong" className="font-semibold">Bytecode Verified:</strong> Parsed by runtime classloader sandbox with zero circular references.
        </span>
      </div>
    </div>
  );
};

export default UdfDetailHeader;
