import React from 'react';
import Button from '../Button';

/**
 * Accessible Modal Footer with action buttons.
 */
export const ModalFooter = ({
  id,
  className = '',
  actions = [],
  onClose,
  children,
}) => {
  return (
    <div
      id={id ? `${id}-footer` : undefined}
      className={`modal-footer ds-modal-footer sticky bottom-0 z-20 flex items-center justify-end gap-2.5 px-6 py-3.5 bg-white border-t border-surface-200 flex-wrap shadow-xs ${className}`}
    >
      {children ? (
        children
      ) : actions.length > 0 ? (
        actions.map((act, i) => (
          <Button
            key={i}
            id={act.id || (id ? `${id}-action-${i}` : undefined)}
            variant={act.variant || (i === actions.length - 1 ? 'primary' : 'secondary')}
            size={act.size || 'md'}
            onClick={act.onClick}
            disabled={act.disabled || act.loading}
            style={act.style}
          >
            {act.label}
          </Button>
        ))
      ) : (
        <Button variant="secondary" size="md" onClick={onClose}>
          Close
        </Button>
      )}
    </div>
  );
};

export default ModalFooter;
