import React from 'react';
import { Download, Play } from 'lucide-react';
import AdapterConfigTable from './AdapterConfigTable';
import AdapterPayloadPreview from './AdapterPayloadPreview';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AdapterDetailPane = ({ adapter, onCreatePipeline }) => {
  if (!adapter) {
    return (
      <main id="adapter-detail-empty" className="flex-1 p-8 text-center text-xs text-content-tertiary">
        Select a connector adapter from the list to inspect configuration schema.
      </main>
    );
  }

  const isReader = adapter.adapterType === 'READER';

  return (
    <main id="adapter-detail-pane" className="flex-1 overflow-y-auto p-5 lg:p-7 flex flex-col gap-5 bg-surface-50">
      <div id="adapter-detail-header-card" className="bg-white border border-surface-200 rounded-xl p-5 shadow-subtle flex flex-col gap-4">
        <div id="adapter-detail-top-row" className="flex items-start justify-between gap-4 flex-wrap">
          <div id="adapter-detail-info-group" className="flex items-center gap-3.5">
            <div id="adapter-detail-icon-badge" className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 text-brand-700 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
              {isReader ? 'SRC' : 'TGT'}
            </div>
            <div id="adapter-detail-titles">
              <div id="adapter-detail-title-row" className="flex items-center gap-2.5">
                <h2 id="adapter-detail-name" className="text-base font-bold text-content-primary">{adapter.name}</h2>
                <span id={adapter.isOfficial ? 'adapter-detail-official-badge' : 'adapter-detail-custom-badge'} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${adapter.isOfficial ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {adapter.isOfficial ? 'Official SPI' : 'Custom Upload'}
                </span>
              </div>
              <p id="adapter-detail-meta" className="font-mono text-xs text-content-secondary mt-0.5">
                key: <strong id="adapter-key-strong" className="text-content-primary">{adapter.adapterKey}</strong> • v{adapter.version} • {formatBytes(adapter.sizeBytes)} • Active in {adapter.pipelineCount ?? 0} pipeline(s)
              </p>
            </div>
          </div>

          <div id="adapter-detail-actions" className="flex items-center gap-2">
            <button
              id="adapter-download-btn"
              type="button"
              onClick={() => alert(`Downloading ${adapter.artifactName || adapter.adapterKey + '.jar'}...`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-content-primary bg-white hover:bg-surface-50 border border-surface-300 rounded-lg shadow-subtle transition-colors"
            >
              <Download id="adapter-download-icon" className="w-3.5 h-3.5 text-content-secondary" />
              <span>Download JAR</span>
            </button>
            <button
              id="adapter-create-pipe-btn"
              type="button"
              onClick={() => onCreatePipeline && onCreatePipeline(adapter)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-hover rounded-lg shadow-subtle transition-colors"
            >
              <Play id="adapter-play-icon" className="w-3 h-3 fill-current" />
              <span>Create Pipeline</span>
            </button>
          </div>
        </div>

        <p id="adapter-detail-desc" className="text-xs text-content-secondary bg-surface-50 p-3 rounded-lg border border-surface-200 leading-relaxed">
          {adapter.description}
        </p>

        <div id="adapter-detail-spi-meta" className="flex items-center gap-3 text-xs flex-wrap">
          <span id="adapter-spi-class-span" className="flex items-center gap-1.5 text-content-secondary">
            <strong>SPI Class:</strong>
            <code id="adapter-spi-class-code" className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-brand-700">{adapter.className}</code>
          </span>
          <span className="text-surface-300">•</span>
          <span id="adapter-mode-span" className="text-content-secondary">
            <strong>Mode:</strong> <span className="font-medium text-content-primary ml-1">{adapter.supportedMode}</span>
          </span>
          <span className="text-surface-300">•</span>
          <span id="adapter-category-span" className="text-content-secondary">
            <strong>Category:</strong> <span className="font-medium text-content-primary ml-1">{adapter.category}</span>
          </span>
        </div>
      </div>

      <AdapterConfigTable configSchema={adapter.configSchema || []} />
      <AdapterPayloadPreview adapter={adapter} />
    </main>
  );
};

export default AdapterDetailPane;
