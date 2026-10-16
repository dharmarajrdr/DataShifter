import React from 'react';

export const AdapterPayloadPreview = ({ adapter }) => {
  if (!adapter) return null;
  const isReader = adapter.adapterType === 'READER';
  const idField = isReader ? 'sourceAdapterId' : 'targetAdapterId';
  const cfgField = isReader ? 'sourceConfig' : 'targetConfig';

  const sampleObj = {
    [idField]: adapter.id,
    [cfgField]: (adapter.configSchema || []).reduce((acc, c) => {
      acc[c.key] = c.default || (c.type === 'Boolean' ? true : c.type === 'Integer' ? 100 : 'sample');
      return acc;
    }, {})
  };

  return (
    <div id="adapter-payload-preview-card" className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle">
      <div id="adapter-payload-preview-header" className="flex items-center justify-between mb-2">
        <h4 id="adapter-payload-preview-title" className="font-semibold text-xs text-content-primary">
          Example Pipeline Configuration Payload
        </h4>
        <span id="adapter-payload-format-badge" className="text-[11px] font-mono text-content-tertiary">
          JSON Configuration
        </span>
      </div>
      <pre
        id="adapter-payload-json-code"
        className="bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed"
      >
        {JSON.stringify(sampleObj, null, 2)}
      </pre>
    </div>
  );
};

export default AdapterPayloadPreview;
