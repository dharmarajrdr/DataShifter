import React from 'react';

/** Example JSON configuration preview for selected adapter (<= 100 lines). */
export const AdapterPayloadPreview = ({ adapter }) => {
  if (!adapter) return null;
  const isReader = adapter.adapterType === 'READER';
  const idField = isReader ? 'sourceAdapterId' : 'targetAdapterId';
  const cfgField = isReader ? 'sourceConfig' : 'targetConfig';

  let schema = adapter.configSchema;
  if (typeof schema === 'string') {
    try { schema = JSON.parse(schema); } catch { schema = []; }
  }
  const items = Array.isArray(schema) ? schema : (schema?.properties || []);

  const sampleObj = {
    [idField]: adapter.id,
    [cfgField]: items.reduce((acc, c) => {
      const k = c.key || c.name;
      if (!k) return acc;
      acc[k] = c.default ?? c.defaultValue ?? (c.type === 'Boolean' ? true : c.type === 'Integer' ? 100 : 'sample');
      return acc;
    }, {})
  };

  return (
    <div id="adapter-payload-preview-card" className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle">
      <div id="adapter-payload-preview-header" className="flex items-center justify-between mb-2">
        <h4 id="adapter-payload-preview-title" className="font-semibold text-xs text-content-primary">
          Example Pipeline Configuration Payload
        </h4>
        <span id="adapter-payload-format-badge" className="text-[11px] font-sans text-content-tertiary">
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
