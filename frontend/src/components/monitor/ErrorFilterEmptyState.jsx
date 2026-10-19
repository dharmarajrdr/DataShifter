import React from 'react';

export const ErrorFilterEmptyState = ({ onReset }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <i className="fa-solid fa-magnifying-glass text-base" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-1">No errors match your filters</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-4">
        Try adjusting your search keyword, table selection, or error category filter.
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
        >
          Reset all filters
        </button>
      )}
    </div>
  );
};

export default ErrorFilterEmptyState;
