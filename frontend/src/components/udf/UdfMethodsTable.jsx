import React from 'react';
import { Code2 } from 'lucide-react';

export const UdfMethodsTable = ({ functions = [] }) => {
  if (!functions || functions.length === 0) {
    return (
      <div id="udf-methods-empty" className="bg-white border border-surface-200 rounded-xl p-8 text-center text-xs text-content-secondary">
        <Code2 id="udf-methods-empty-icon" className="w-8 h-8 text-content-tertiary mx-auto mb-2" />
        <p id="udf-methods-empty-text" className="font-medium text-content-primary">No callable functions discovered</p>
        <p id="udf-methods-empty-sub" className="text-content-secondary mt-1">This JAR does not contain public methods annotated for pipeline execution.</p>
      </div>
    );
  }

  return (
    <div id="udf-methods-table-wrap" className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-subtle">
      <div id="udf-methods-table-scroll" className="overflow-x-auto">
        <table id="udf-methods-table" className="w-full text-left text-xs border-collapse">
          <thead id="udf-methods-thead" className="bg-surface-50 border-b border-surface-200 text-content-secondary uppercase text-[10.5px] font-semibold tracking-wider">
            <tr>
              <th id="th-function" className="py-2.5 px-4">Callable Function</th>
              <th id="th-signature" className="py-2.5 px-4">Bytecode Signature</th>
              <th id="th-return" className="py-2.5 px-4">Return Type</th>
            </tr>
          </thead>
          <tbody id="udf-methods-tbody" className="divide-y divide-surface-100">
            {functions.map((fn, idx) => {
              const fnName = fn.functionName || fn.methodName || 'unknownMethod';
              const className = fn.className || '';
              const params = (fn.parameterTypes || []).join(', ');
              const retType = fn.returnType || 'void';

              return (
                <tr key={fn.id || `${className}.${fnName}-${idx}`} id={`udf-method-row-${idx}`} className="hover:bg-surface-50 transition-colors">
                  <td id={`udf-method-name-cell-${idx}`} className="py-3 px-4">
                    <div id={`udf-method-name-wrap-${idx}`} className="flex items-center gap-2">
                      <span id={`udf-method-name-${idx}`} className="font-mono font-semibold text-content-primary">
                        {fnName}()
                      </span>
                      <span id={`udf-method-tag-${idx}`} className="font-mono text-[10px] font-medium bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded border border-brand-100">
                        @UDF
                      </span>
                    </div>
                  </td>
                  <td id={`udf-method-sig-cell-${idx}`} className="py-3 px-4">
                    <div id={`udf-method-sig-code-${idx}`} className="font-mono text-[11px] bg-surface-50 border border-surface-200 rounded px-2 py-1 inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                      {className && <span id={`udf-sig-cls-${idx}`} className="text-sky-600">{className}.</span>}
                      <span id={`udf-sig-fn-${idx}`} className="text-brand-700 font-medium">{fnName}</span>
                      <span id={`udf-sig-params-${idx}`} className="text-content-secondary">({params})</span>
                    </div>
                  </td>
                  <td id={`udf-method-ret-cell-${idx}`} className="py-3 px-4">
                    <span id={`udf-method-ret-badge-${idx}`} className="font-mono text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded inline-block">
                      {retType}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UdfMethodsTable;
