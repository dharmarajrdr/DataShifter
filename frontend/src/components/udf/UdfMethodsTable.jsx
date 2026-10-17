import React from 'react';
import { Code2 } from 'lucide-react';
import UdfMethodRow from './UdfMethodRow';

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
              <th id="th-function" className="py-2.5 px-4 whitespace-nowrap">Callable Function</th>
              <th id="th-return" className="py-2.5 px-4 whitespace-nowrap">Return Type</th>
            </tr>
          </thead>
          <tbody id="udf-methods-tbody" className="divide-y divide-surface-100">
            {functions.map((fn, idx) => (
              <UdfMethodRow key={fn.id || `${fn.className || ''}.${fn.functionName || fn.methodName}-${idx}`} fn={fn} index={idx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UdfMethodsTable;
