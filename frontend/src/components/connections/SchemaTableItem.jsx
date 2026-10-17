import React from 'react';

export const SchemaTableItem = ({ table, isExpanded, onToggle, columns }) => {
  const tableColumns = columns[table];

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div
        onClick={() => onToggle(table)}
        className={`flex items-center justify-between px-5 py-2.5 cursor-pointer select-none transition-colors ${
          isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/70'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-slate-400 text-xs w-3 flex justify-center">
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} />
          </span>
          <span className="text-xs font-semibold text-slate-800 truncate">{table}</span>
        </div>
        {tableColumns && (
          <span className="text-[11px] text-slate-400 font-medium shrink-0">
            {tableColumns.length} cols
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="px-5 pl-10 pb-3 pt-1 space-y-1.5 bg-slate-50/50">
          {!tableColumns ? (
            <p className="text-[11px] text-slate-400 italic py-1">Loading columns...</p>
          ) : tableColumns.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic py-1">No columns available</p>
          ) : (
            tableColumns.map((col) => (
              <div key={col.columnName} className="flex items-center gap-2 text-xs py-0.5">
                {col.primaryKey && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold">
                    PK
                  </span>
                )}
                <span className="font-mono text-slate-800 text-[11px]">{col.columnName}</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">
                  {col.dataType}
                </span>
                {!col.nullable && (
                  <span className="text-[9px] font-bold text-amber-600">NOT NULL</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SchemaTableItem;
