import React from 'react';
import { Button } from '../../common';
import { WIZARD } from '../../../constants/literals';

/**
 * Navigation footer for Pipeline Wizard (<= 100 lines).
 */
export const WizardFooter = ({
  id = 'wizard-footer',
  step = 0,
  maxSteps = 5,
  onBack,
  onNext,
  onCreate,
  creating = false,
  error = null,
}) => {
  const isFinalStep = step === maxSteps - 1;
  const nextLabels = ['Source Adapter', 'Target Adapter', 'Entity Mapping', 'Review'];

  return (
    <footer
      id={id}
      className="wizard-footer-bar flex items-center justify-between pt-3 pb-2 border-t border-slate-200 mt-auto bg-white"
    >
      <Button
        id={`${id}-back-btn`}
        variant="secondary"
        size="md"
        onClick={onBack}
      >
        {step === 0 ? 'Cancel' : WIZARD.back}
      </Button>

      <div id={`${id}-actions-group`} className="flex items-center gap-2">
        {error && (
          <span id={`${id}-error-text`} className="text-xs text-rose-600 font-medium mr-2">
            {error}
          </span>
        )}
        {!isFinalStep ? (
          <Button
            id={`${id}-next-btn`}
            variant="primary"
            size="md"
            onClick={onNext}
          >
            <span>Next: {nextLabels[step] || 'Next'}</span>
            <i className="fa-solid fa-arrow-right text-xs ml-1.5" />
          </Button>
        ) : (
          <Button
            id={`${id}-create-btn`}
            variant="primary"
            size="md"
            onClick={onCreate}
            disabled={creating}
          >
            <i className="fa-solid fa-bolt text-xs mr-1.5" />
            <span>{creating ? 'Creating Pipeline...' : 'Create & Map Columns'}</span>
          </Button>
        )}
      </div>
    </footer>
  );
};

export default WizardFooter;
