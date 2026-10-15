import React from 'react';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../../constants/design';
import { FRSC } from '../../../constants/layouts';

/**
 * Step 1: Pipeline Basics (Name, Description, Namespace) (<= 100 lines).
 */
export const WizardStepBasics = ({
  id = 'wizard-step-basics',
  config,
  setConfig,
  namespaces = [],
  onCreateNamespace,
  errors = {},
}) => (
  <div id={id} className="wizard-step-basics-panel max-w-xl mx-auto py-2">
    <div id={`${id}-header`} className="mb-4">
      <h3 id={`${id}-title`} className="text-base font-semibold text-slate-900">
        Pipeline Basics
      </h3>
      <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-1">
        Define name, description, and assign your pipeline to a logical namespace.
      </p>
    </div>

    {/* Pipeline Name */}
    <div id={`${id}-name-group`} className="mb-4">
      <label id={`${id}-name-label`} className="block text-xs font-semibold text-slate-700 mb-1">
        Pipeline Name <span className="text-rose-500">*</span>
      </label>
      <input
        id={`${id}-name-input`}
        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        style={{ borderColor: errors.name ? '#EF4444' : '#E2E8F0' }}
        value={config.name || ''}
        onChange={(e) => setConfig({ ...config, name: e.target.value })}
        placeholder="e.g., Oracle to S3 Analytics Stream"
      />
      {errors.name && (
        <p id={`${id}-name-error`} className="text-xs text-rose-500 mt-1">
          {errors.name}
        </p>
      )}
    </div>

    {/* Description */}
    <div id={`${id}-desc-group`} className="mb-4">
      <label id={`${id}-desc-label`} className="block text-xs font-semibold text-slate-700 mb-1">
        Description
      </label>
      <textarea
        id={`${id}-desc-textarea`}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={config.description || ''}
        onChange={(e) => setConfig({ ...config, description: e.target.value })}
        placeholder="Describe replication topology, target lake schemas, or SLA..."
      />
    </div>

    {/* Namespace */}
    <div id={`${id}-ns-group`} className="mb-2">
      <label id={`${id}-ns-label`} className="block text-xs font-semibold text-slate-700 mb-1">
        Namespace
      </label>
      <div id={`${id}-ns-chips`} style={{ ...FRSC, gap: '8px', flexWrap: 'wrap' }}>
        {namespaces.map((ns) => {
          const isSelected = config.namespaceId === ns.id;
          return (
            <button
              key={ns.id}
              type="button"
              id={`${id}-ns-chip-${ns.id}`}
              onClick={() => setConfig({ ...config, namespaceId: ns.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: ns.color || '#4F46E5' }} />
              <span>{ns.name}</span>
            </button>
          );
        })}
        <button
          type="button"
          id={`${id}-create-ns-btn`}
          onClick={onCreateNamespace}
          className="px-2.5 py-1.5 border border-dashed border-indigo-500 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
        >
          <i className="fa-solid fa-plus text-xs" />
          <span>New</span>
        </button>
      </div>
    </div>
  </div>
);

export default WizardStepBasics;
