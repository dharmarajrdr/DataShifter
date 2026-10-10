import React, { useState, useRef } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRSC } from '../../constants/layouts';
import Chip from './Chip';

/**
 * SortableList — drag-to-reorder using native HTML5 DnD.
 *
 * Props:
 *   items           — string[] — ordered list of items
 *   onReorder       — (newItems: string[]) => void
 *   onRemove        — (item: string) => void
 *   renderLabel     — (item: string, index: number) => ReactNode (optional)
 *   numbered        — boolean — show order number chips (default: true)
 *   chipColor       — string — color scheme for number chips (default: 'purple')
 */
const SortableList = ({
  items,
  onReorder,
  onRemove,
  renderLabel,
  numbered = true,
  chipColor = 'purple',
}) => {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragNode = useRef(null);

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    dragNode.current = e.target;
    // Make the drag image slightly transparent
    e.dataTransfer.effectAllowed = 'move';
    // Needed for Firefox
    e.dataTransfer.setData('text/plain', idx.toString());
    // Delay style change to avoid flickering the dragged item
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = '1';
    setDragIdx(null);
    setOverIdx(null);
    dragNode.current = null;
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIdx === null || dragIdx === idx) return;
    setOverIdx(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newItems = [...items];
    const [moved] = newItems.splice(dragIdx, 1);
    newItems.splice(idx, 0, moved);
    onReorder(newItems);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div style={{
      border: `1px solid ${COLORS.border.light}`,
      borderRadius: BORDER_RADIUS.md,
      padding: '6px',
      minHeight: '80px',
    }}>
      {items.length === 0 && (
        <div style={{
          padding: '20px', textAlign: 'center',
          color: COLORS.text.tertiary, fontSize: FONT.size.sm,
        }}>
          No tables selected. Add tables from the left panel.
        </div>
      )}
      {items.map((item, i) => {
        const isOver = overIdx === i && dragIdx !== i;
        const isDragging = dragIdx === i;

        return (
          <div
            key={item}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            style={{
              ...FRSC,
              gap: SPACING.xs,
              padding: '7px 10px',
              fontSize: FONT.size.sm,
              background: isDragging ? COLORS.background.tertiary : COLORS.background.secondary,
              borderRadius: BORDER_RADIUS.sm,
              marginBottom: SPACING.xxs,
              cursor: 'grab',
              borderTop: isOver ? `2px solid ${COLORS.brand.primary}` : '2px solid transparent',
              transition: 'border-top 0.1s ease',
              userSelect: 'none',
            }}
          >
            {/* Grab handle */}
            <span style={{
              color: COLORS.text.tertiary, fontSize: '14px',
              cursor: 'grab', userSelect: 'none', lineHeight: 1,
            }}>
              ☰
            </span>

            {/* Order number */}
            {numbered && (
              <Chip
                label={String(i + 1)}
                colorScheme={chipColor}
                style={{ fontSize: '10px', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}
              />
            )}

            {/* Label */}
            <span style={{ flex: 1, color: COLORS.text.primary }}>
              {renderLabel ? renderLabel(item, i) : item}
            </span>

            {/* Remove button */}
            {onRemove && (
              <span
                onClick={(e) => { e.stopPropagation(); onRemove(item); }}
                style={{
                  cursor: 'pointer', color: COLORS.text.tertiary,
                  fontSize: '16px', lineHeight: 1, padding: '0 2px',
                }}
                onMouseEnter={e => e.target.style.color = COLORS.status.errorDark}
                onMouseLeave={e => e.target.style.color = COLORS.text.tertiary}
              >
                ×
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SortableList;