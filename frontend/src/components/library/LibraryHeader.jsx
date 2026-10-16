import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, ShoppingBag, Upload } from 'lucide-react';

export const LibraryHeader = ({
  activeTab = 'adapters', onTabChange, adapterCount = 0,
  udfCount = 0, onUploadClick, canUpload = true,
}) => {
  const navigate = useNavigate();

  return (
    <div id="library-header-wrapper" className="bg-white border-b border-surface-200 px-6 pt-5 pb-0 flex flex-col gap-4 flex-shrink-0">
      <div id="library-header-top" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div id="library-header-branding" className="flex items-center gap-3.5">
          <div id="library-icon-box" className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0 shadow-xs">
            <Library id="library-main-icon" className="w-5 h-5" />
          </div>
          <div id="library-title-group">
            <div id="library-heading-row" className="flex items-center gap-2.5">
              <h1 id="library-heading-title" className="text-lg font-bold text-content-primary tracking-tight">Artifact & Extension Library</h1>
              <span id="library-total-count-badge" className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                {adapterCount + udfCount} Extensions
              </span>
            </div>
            <p id="library-subtitle" className="text-xs text-content-secondary mt-0.5">
              Centralized repository for Connector Adapters (Readers, Writers, Streaming CDC) and Java UDF transformation binaries.
            </p>
          </div>
        </div>

        <div id="library-actions-group" className="flex items-center gap-2.5">
          <button
            id="library-marketplace-link-btn"
            type="button"
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-content-primary bg-white hover:bg-surface-50 border border-surface-300 rounded-lg shadow-subtle transition-colors"
          >
            <ShoppingBag id="library-marketplace-icon" className="w-4 h-4 text-brand-600" />
            <span>Marketplace</span>
          </button>
          {canUpload && (
            <button
              id="library-primary-upload-btn"
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-hover rounded-lg shadow-subtle transition-colors"
            >
              <Upload id="library-upload-icon" className="w-4 h-4" />
              <span id="library-upload-btn-label">
                {activeTab === 'adapters' ? 'Install Adapter' : 'Upload UDF JAR'}
              </span>
            </button>
          )}
        </div>
      </div>

      <div id="library-domain-tabs" className="flex items-center gap-8 border-b border-surface-200 mt-2">
        <button
          id="lib-tab-adapters"
          type="button"
          onClick={() => onTabChange('adapters')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'adapters' ? 'border-brand-600 text-brand-600' : 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <span>Connector Adapters</span>
          <span id="badge-adapter-count" className={`ml-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${activeTab === 'adapters' ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-content-secondary'}`}>
            {adapterCount}
          </span>
        </button>

        <button
          id="lib-tab-udfs"
          type="button"
          onClick={() => onTabChange('udfs')}
          className={`pb-3 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'udfs' ? 'border-brand-600 text-brand-600 font-semibold' : 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <span>User Defined Functions (UDFs)</span>
          <span id="badge-udf-count" className={`ml-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${activeTab === 'udfs' ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-content-secondary'}`}>
            {udfCount}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LibraryHeader;
