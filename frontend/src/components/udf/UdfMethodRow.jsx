import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const UdfMethodRow = ({ fn = {}, index = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fnName = fn.functionName || fn.methodName || 'unknownMethod';
  const retType = fn.returnType || 'void';
  const description = fn.description || fn.desc || 'No description provided for this function.';

  return (
    <tr id={`udf-method-row-${index}`} className="hover:bg-surface-50 transition-colors">
      <td id={`udf-method-name-cell-${index}`} className="py-3 px-4">
        <div id={`udf-method-name-wrap-${index}`} className="flex items-center gap-2 whitespace-nowrap">
          <button
            id={`udf-method-toggle-${index}`}
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded transition-colors"
            title={isExpanded ? 'Hide description' : 'Show description'}
            aria-expanded={isExpanded}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-brand-600' : ''}`} />
          </button>
          <span id={`udf-method-tag-${index}`} className="font-mono text-[10px] font-medium bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded border border-brand-100 whitespace-nowrap">
            @UDF
          </span>
          <span id={`udf-method-name-${index}`} className="font-mono font-semibold text-content-primary whitespace-nowrap">
            {fnName}()
          </span>
        </div>
        {isExpanded && (
          <div id={`udf-method-desc-${index}`} className="mt-2 pl-7 text-xs text-content-secondary leading-relaxed">
            {description}
          </div>
        )}
      </td>
      <td id={`udf-method-ret-cell-${index}`} className="py-3 px-4 whitespace-nowrap align-top pt-3.5">
        <span id={`udf-method-ret-badge-${index}`} className="font-mono text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded inline-block whitespace-nowrap">
          {retType}
        </span>
      </td>
    </tr>
  );
};

export default UdfMethodRow;
