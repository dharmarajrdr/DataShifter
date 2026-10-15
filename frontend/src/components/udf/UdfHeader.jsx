import React from 'react';
import { Upload, ShieldCheck, Box } from 'lucide-react';

export const UdfHeader = ({ jarCount = 0, onUploadClick, canUpload = true }) => {
  return (
    <header
      id="udf-header"
      className="bg-white border-b border-surface-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0"
    >
      <div id="udf-header-meta" className="flex items-center gap-3">
        <div
          id="udf-header-icon-box"
          className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0"
        >
          <Box id="udf-header-icon" className="w-5 h-5" />
        </div>
        <div id="udf-header-titles">
          <div id="udf-header-title-row" className="flex items-center gap-2">
            <h1 id="udf-header-title" className="text-lg font-semibold text-content-primary tracking-tight">
              Installed Artifacts & UDF Library
            </h1>
            <span
              id="udf-header-badge"
              className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 tabular-nums"
            >
              {jarCount} {jarCount === 1 ? 'JAR' : 'JARs'}
            </span>
          </div>
          <div id="udf-header-subtitle-row" className="flex items-center gap-1.5 text-xs text-content-secondary mt-0.5">
            <ShieldCheck id="udf-header-shield-icon" className="w-3.5 h-3.5 text-status-success" />
            <span id="udf-header-subtitle">
              Introspected Java binaries executed in sandbox classloader for pipeline transformation
            </span>
          </div>
        </div>
      </div>

      <div id="udf-header-actions" className="flex items-center gap-3">
        {canUpload && (
          <button
            id="udf-upload-trigger-btn"
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-hover rounded-lg shadow-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          >
            <Upload id="udf-upload-btn-icon" className="w-3.5 h-3.5" />
            <span id="udf-upload-btn-label">Upload JAR</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default UdfHeader;
