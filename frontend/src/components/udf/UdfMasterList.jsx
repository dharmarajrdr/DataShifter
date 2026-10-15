import React from 'react';
import { Search, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const STATUS_CONFIG = {
  READY: { label: 'Ready', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  VALIDATING: { label: 'Validating', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock3 },
  FAILED: { label: 'Failed', badge: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
};

export const UdfMasterList = ({
  jars = [], selectedId, onSelectJar, searchQuery, onSearchChange, statusFilter, onStatusFilterChange,
}) => {
  const statuses = ['ALL', 'READY', 'VALIDATING', 'FAILED'];

  return (
    <aside id="udf-master-pane" className="w-full md:w-80 lg:w-96 bg-white border-r border-surface-200 flex flex-col flex-shrink-0">
      <div id="udf-master-filter-section" className="p-4 border-b border-surface-200 flex flex-col gap-3">
        <div id="udf-master-search-wrap" className="relative">
          <Search id="udf-master-search-icon" className="w-4 h-4 text-content-tertiary absolute left-3 top-2.5" />
          <input
            id="udf-master-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search JARs, methods..."
            className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-surface-50 border border-surface-300 rounded-lg text-content-primary placeholder-content-tertiary focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
          />
        </div>
        <div id="udf-master-status-filters" className="flex items-center gap-1.5 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status}
              id={`udf-filter-${status.toLowerCase()}`}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === status ? 'bg-brand-600 text-white font-semibold' : 'bg-surface-100 text-content-secondary hover:text-content-primary hover:bg-surface-200'
              }`}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div id="udf-master-jar-list" className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {jars.length === 0 ? (
          <div id="udf-master-empty" className="p-6 text-center text-xs text-content-tertiary">No JAR artifacts match the selected filters.</div>
        ) : (
          jars.map((jar) => {
            const isSelected = jar.id === selectedId;
            const statusMeta = STATUS_CONFIG[jar.status] || STATUS_CONFIG.VALIDATING;
            const StatusIcon = statusMeta.icon;

            return (
              <div
                key={jar.id}
                id={`udf-master-item-${jar.id}`}
                onClick={() => onSelectJar(jar.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all relative flex flex-col gap-1.5 ${
                  isSelected ? 'bg-brand-50 border-brand-300 shadow-subtle' : 'bg-white border-surface-200 hover:bg-surface-50 hover:border-surface-300'
                }`}
              >
                {isSelected && <span id={`udf-item-active-bar-${jar.id}`} className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-brand-600 rounded-r" />}
                <div id={`udf-item-row-header-${jar.id}`} className="flex items-center justify-between gap-2">
                  <span id={`udf-item-name-${jar.id}`} className="text-xs font-semibold text-content-primary truncate">{jar.name}</span>
                  <span id={`udf-item-status-${jar.id}`} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${statusMeta.badge}`}>
                    <StatusIcon id={`udf-item-status-icon-${jar.id}`} className="w-2.5 h-2.5" />
                    {statusMeta.label}
                  </span>
                </div>
                <div id={`udf-item-meta-${jar.id}`} className="flex items-center gap-2 text-[11px] text-content-secondary tabular-nums">
                  <span id={`udf-item-version-${jar.id}`}>v{jar.version || '1.0.0'}</span>
                  <span>•</span>
                  <span id={`udf-item-size-${jar.id}`}>{formatBytes(jar.sizeBytes)}</span>
                  <span>•</span>
                  <span id={`udf-item-pipes-${jar.id}`}>{jar.pipelineCount ?? 0} pipes</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default UdfMasterList;
