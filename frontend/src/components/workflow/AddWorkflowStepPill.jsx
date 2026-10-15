import React from 'react';

const AddWorkflowStepPill = ({
  onClick,
  active = false,
  label = '+ Add Workflow Steps',
  disabled = false,
}) => {
  const displayLabel = label.replace(/^\+\s*/, '');

  return (
    <button
      id={`workflow-add-step-pill-${displayLabel.toLowerCase().replace(/\s+/g, '-')}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-xs md:text-sm tracking-tight transition-all duration-150 shadow-sm ${
        active
          ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-600 ring-2 ring-indigo-500/20'
          : 'bg-white text-slate-800 border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 hover:bg-slate-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <i
        id="workflow-add-step-pill-icon"
        className="fa-solid fa-plus text-xs text-indigo-600"
        aria-hidden="true"
      />
      <span id="workflow-add-step-pill-label">{displayLabel}</span>
    </button>
  );
};

export default AddWorkflowStepPill;
