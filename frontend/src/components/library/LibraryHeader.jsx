import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Upload } from 'lucide-react';

export const LibraryHeader = ({
  activeTab = 'adapters',
  onTabChange,
  adapterCount = 0,
  udfCount = 0,
  onUploadClick,
  canUpload = true,
}) => {
  const navigate = useNavigate();

  return (
    <div id="library-header-wrapper" className="flex flex-col gap-4 flex-shrink-0 select-none mb-2">
      <div id="library-header-top" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div id="library-header-branding" className="space-y-1">
          <div id="library-heading-row" className="flex items-center gap-2.5">
            <h1 id="library-heading-title" className="text-2xl font-bold text-slate-900 tracking-tight">
              Artifact & Extension Library
            </h1>
            <span id="library-total-count-badge" className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {adapterCount + udfCount} Extensions
            </span>
          </div>
          <p id="library-subtitle" className="text-sm text-slate-500">
            Centralized repository for Connector Adapters (Readers, Writers, Streaming CDC) and Java UDF transformation binaries.
          </p>
        </div>

        <div id="library-actions-group" className="flex items-center gap-2.5 flex-wrap">
          <button
            id="library-marketplace-link-btn"
            type="button"
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-subtle transition-colors"
          >
            <ShoppingBag id="library-marketplace-icon" className="w-4 h-4 text-brand" />
            <span>Marketplace</span>
          </button>
          {canUpload && (
            <button
              id="library-primary-upload-btn"
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg shadow-subtle transition-colors"
            >
              <Upload id="library-upload-icon" className="w-4 h-4" />
              <span id="library-upload-btn-label">
                {activeTab === 'adapters' ? 'Install Adapter' : 'Upload UDF JAR'}
              </span>
            </button>
          )}
        </div>
      </div>

      <div id="library-domain-tabs" className="flex items-center gap-8 border-b border-slate-200 mt-2">
        <button
          id="lib-tab-adapters"
          type="button"
          onClick={() => onTabChange('adapters')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'adapters' ? 'border-brand text-brand font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Connector Adapters</span>
          <span id="badge-adapter-count" className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === 'adapters' ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-600'}`}>
            {adapterCount}
          </span>
        </button>

        <button
          id="lib-tab-udfs"
          type="button"
          onClick={() => onTabChange('udfs')}
          className={`pb-2.5 text-xs font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'udfs' ? 'border-brand text-brand font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>User Defined Functions (UDFs)</span>
          <span id="badge-udf-count" className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === 'udfs' ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-600'}`}>
            {udfCount}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LibraryHeader;
