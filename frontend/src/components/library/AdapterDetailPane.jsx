import React, { useState } from 'react';
import { Download, Play } from 'lucide-react';
import AdapterConfigTable from './AdapterConfigTable';
import AdapterPayloadPreview from './AdapterPayloadPreview';
import { useNotification } from '../../contexts/NotificationContext';
import { adapterApi } from '../../services/adapterApi';

const formatBytes = (b) => (!b ? '—' : b < 1048576 ? `${Math.ceil(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export const AdapterDetailPane = ({ adapter, onCreatePipeline }) => {
  const notification = useNotification();
  const [downloading, setDownloading] = useState(false);

  if (!adapter) {
    return <main id="adapter-detail-empty" className="flex-1 p-8 text-center text-xs text-content-tertiary font-sans">Select a connector adapter from the list to inspect configuration schema.</main>;
  }

  const handleDownload = async () => {
    const fn = adapter.artifactName || `${adapter.adapterKey || 'adapter'}.jar`;
    setDownloading(true);
    notification.info(`Downloading ${fn}...`);
    try {
      await adapterApi.download(adapter.id, fn);
      notification.success(`${fn} downloaded successfully`);
    } catch (err) {
      notification.error(err.message || `Failed to download ${fn}`);
    } finally { setDownloading(false); }
  };

  const isReader = adapter.adapterType === 'READER';

  return (
    <main id="adapter-detail-pane" className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-4 bg-surface-50 font-sans">
      <div id="adapter-detail-header-card" className="bg-white border border-surface-200 rounded-xl p-5 shadow-subtle flex flex-col gap-4">
        <div id="adapter-detail-top-row" className="flex items-start justify-between gap-4 flex-wrap">
          <div id="adapter-detail-info-group" className="flex items-center gap-3.5">
            <div id="adapter-detail-icon-badge" className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 font-mono font-semibold text-xs flex items-center justify-center flex-shrink-0">
              {isReader ? 'SRC' : 'TGT'}
            </div>
            <div id="adapter-detail-titles">
              <div id="adapter-detail-title-row" className="flex items-center gap-2.5">
                <h2 id="adapter-detail-name" className="text-base font-semibold text-content-primary">{adapter.name}</h2>
                {adapter.isOfficial ? <i id="adapter-official-icon" className="fa fa-check-circle text-blue-700" title="Official Adapter" /> : <i id="adapter-custom-icon" className="fa fa-certificate text-orange-400" title="Custom Adapter" />}
              </div>
              <p id="adapter-detail-meta" className="text-xs text-content-secondary mt-0.5 tabular-nums">
                key: <strong id="adapter-key-strong" className="font-mono text-content-primary">{adapter.adapterKey}</strong> • Version {adapter.version || '1.0.0'} • {formatBytes(adapter.sizeBytes)} • Active in {adapter.pipelineCount ?? 0} pipeline(s)
              </p>
            </div>
          </div>

          <div id="adapter-detail-actions" className="flex items-center gap-2">
            <button
              id="adapter-download-btn" type="button" disabled={downloading} onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-content-primary bg-white hover:bg-surface-50 border border-surface-300 rounded-lg shadow-subtle transition-colors disabled:opacity-50"
            >
              <Download id="adapter-download-icon" className={`w-3.5 h-3.5 text-content-secondary ${downloading ? 'animate-pulse' : ''}`} />
              <span>{downloading ? 'Downloading...' : 'Download JAR'}</span>
            </button>
            <button
              id="adapter-create-pipe-btn" type="button" onClick={() => onCreatePipeline && onCreatePipeline(adapter)}
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
          <span id="adapter-mode-span" className="text-content-secondary"><strong>Mode:</strong> <span className="font-medium text-content-primary ml-1">{adapter.supportedMode}</span></span>
          <span className="text-surface-300">•</span>
          <span id="adapter-category-span" className="text-content-secondary"><strong>Category:</strong> <span className="font-medium text-content-primary ml-1">{adapter.category}</span></span>
        </div>
      </div>

      <AdapterConfigTable configSchema={adapter.configSchema || []} />
      <AdapterPayloadPreview adapter={adapter} />
    </main>
  );
};

export default AdapterDetailPane;
