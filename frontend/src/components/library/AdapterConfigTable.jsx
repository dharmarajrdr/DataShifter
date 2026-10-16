import React from 'react';

export const AdapterConfigTable = ({ configSchema = [] }) => {
  return (
    <div id="adapter-config-table-card" className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-subtle flex flex-col font-sans">
      <div id="adapter-config-table-header" className="px-4 py-2.5 border-b border-surface-200 bg-surface-50 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 id="adapter-config-table-title" className="font-semibold text-xs text-content-primary uppercase tracking-wider">
            Required Pipeline Config Properties
          </h3>
          <p id="adapter-config-table-sub" className="text-[11px] text-content-secondary mt-0.5">
            Parameters validated dynamically when configuring this adapter in Pipeline Wizard
          </p>
        </div>
        <span id="adapter-config-count-badge" className="text-[11px] text-content-secondary font-medium tabular-nums">
          {configSchema.length} Config Keys
        </span>
      </div>

      <div id="adapter-config-scroll" className="overflow-x-auto max-h-56 overflow-y-auto">
        {(!configSchema || configSchema.length === 0) ? (
          <div id="adapter-config-empty" className="p-6 text-center text-xs text-content-tertiary">
            No configuration parameters required for this adapter.
          </div>
        ) : (
          <table id="adapter-config-table" className="w-full text-left text-xs border-collapse">
            <thead id="adapter-config-thead" className="sticky top-0 bg-surface-50 border-b border-surface-200 text-content-secondary uppercase text-[10.5px] font-semibold tracking-wider z-10 shadow-xs">
              <tr>
                <th id="th-config-key" className="py-2 px-4 whitespace-nowrap">Parameter Key</th>
                <th id="th-config-type" className="py-2 px-4 whitespace-nowrap">Type</th>
                <th id="th-config-default" className="py-2 px-4 whitespace-nowrap">Default Value</th>
                <th id="th-config-req" className="py-2 px-4 whitespace-nowrap">Requirement</th>
                <th id="th-config-desc" className="py-2 px-4">Description</th>
              </tr>
            </thead>
            <tbody id="adapter-config-tbody" className="divide-y divide-surface-100">
              {configSchema.map((cfg, idx) => (
                <tr key={cfg.key || idx} id={`adapter-config-row-${idx}`} className="hover:bg-surface-50 transition-colors">
                  <td id={`adapter-cfg-key-${idx}`} className="py-2 px-4 font-mono font-semibold text-brand-700 whitespace-nowrap">
                    {cfg.key}
                  </td>
                  <td id={`adapter-cfg-type-${idx}`} className="py-2 px-4 font-mono text-cyan-700 whitespace-nowrap">
                    {cfg.type}
                  </td>
                  <td id={`adapter-cfg-def-${idx}`} className="py-2 px-4 font-mono text-content-secondary whitespace-nowrap">
                    {cfg.default || '—'}
                  </td>
                  <td id={`adapter-cfg-req-${idx}`} className="py-2 px-4 whitespace-nowrap">
                    {cfg.required ? (
                      <span id={`adapter-cfg-req-badge-${idx}`} className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-50 text-red-600 border border-red-200">
                        Required
                      </span>
                    ) : (
                      <span id={`adapter-cfg-opt-badge-${idx}`} className="px-2 py-0.5 text-[10px] font-medium rounded bg-surface-100 text-content-secondary">
                        Optional
                      </span>
                    )}
                  </td>
                  <td id={`adapter-cfg-desc-${idx}`} className="py-2 px-4 text-content-secondary text-xs">
                    {cfg.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdapterConfigTable;
