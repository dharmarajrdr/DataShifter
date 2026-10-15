import React from 'react';
import { COLORS, FONT, SPACING } from '../../../constants/design';
import { FCCC, FRSC } from '../../../constants/layouts';

/**
 * 5-Step Pipeline Wizard Progress Indicator (<= 100 lines).
 */
export const WizardStepIndicator = ({ id = 'wizard-step-indicator', steps, currentStep }) => (
  <nav
    id={id}
    className="wizard-step-indicator-container flex items-center justify-between"
    aria-label="Pipeline creation progress"
    style={{ ...FRSC, gap: 0, padding: `0 ${SPACING.lg}`, marginBottom: SPACING.md }}
  >
    {steps.map((step, i) => {
      const isDone = i < currentStep;
      const isActive = i === currentStep;
      const stepId = `${id}-step-${i}`;
      return (
        <React.Fragment key={i}>
          <div
            id={`${stepId}-wrapper`}
            className={`wizard-step-node ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
            style={{ ...FCCC, gap: '4px', flexShrink: 0 }}
          >
            <div
              id={`${stepId}-circle`}
              className="wizard-step-circle w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: isActive ? COLORS.brand.primary : isDone ? '#10B981' : 'transparent',
                border: isActive || isDone ? 'none' : `2px solid ${COLORS.border.medium}`,
                color: isActive || isDone ? '#ffffff' : COLORS.text.secondary,
                ...FCCC,
                fontSize: FONT.size.xs,
                fontWeight: FONT.weight.medium,
              }}
            >
              {isDone ? (
                <i id={`${stepId}-check-icon`} className="fa-solid fa-check text-xs" />
              ) : (
                <span id={`${stepId}-number`}>{i + 1}</span>
              )}
            </div>
            <span
              id={`${stepId}-label`}
              className="wizard-step-label text-xs tracking-tight"
              style={{
                fontSize: '11px',
                fontWeight: isActive ? FONT.weight.medium : FONT.weight.regular,
                color: isActive ? COLORS.brand.primary : isDone ? '#10B981' : COLORS.text.secondary,
              }}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              id={`${id}-line-${i}`}
              className="wizard-step-connector flex-1 h-0.5 mx-2"
              style={{
                height: '2px',
                marginBottom: '16px',
                background: isDone ? '#10B981' : COLORS.border.light,
              }}
            />
          )}
        </React.Fragment>
      );
    })}
  </nav>
);

export default WizardStepIndicator;
