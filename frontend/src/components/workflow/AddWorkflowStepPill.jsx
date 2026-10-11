import React, { useState } from 'react';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS } from '../../constants/design';

const AddWorkflowStepPill = ({ onClick, active = false, label = '+ Add Workflow Steps', disabled = false }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '9px 20px',
        borderRadius: BORDER_RADIUS.pill,
        background: active
          ? COLORS.accent.purpleLight
          : hovered
            ? COLORS.background.secondary
            : COLORS.background.primary,
        color: active || hovered ? COLORS.brand.primary : COLORS.text.primary,
        border: active
          ? `1.5px solid ${COLORS.brand.primary}`
          : `1px solid ${hovered ? COLORS.brand.primary : COLORS.border.medium}`,
        boxShadow: hovered ? SHADOWS.md : SHADOWS.sm,
        fontSize: FONT.size.md,
        fontWeight: FONT.weight.medium,
        fontFamily: FONT.family,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <i className="fa-solid fa-plus" style={{ fontSize: 12, color: COLORS.brand.primary }} />
      <span>{label.replace(/^\+\s*/, '')}</span>
    </button>
  );
};

export default AddWorkflowStepPill;

