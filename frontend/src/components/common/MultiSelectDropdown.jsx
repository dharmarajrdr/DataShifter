import React, { useState, useRef, useEffect } from 'react';
import { COLORS, FONT, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/design';

/**
 * Reusable searchable multi-select dropdown.
 *
 * @param {Array<{ value: string|number, label: string, sublabel?: string }>} options - Available options
 * @param {Array<string|number>} value - Currently selected values
 * @param {Function} onChange - Callback invoked with new selected values array
 * @param {string} [placeholder='Select options...'] - Dropdown button placeholder
 * @param {string} [searchPlaceholder='Search...'] - Input placeholder inside menu
 * @param {boolean} [disabled=false] - Whether the dropdown is disabled
 * @param {number} [maxDisplayChips=3] - Maximum number of selected chips to show before "+N more"
 * @param {string} [emptyMessage='No options found'] - Message when no options match filter
 */
const MultiSelectDropdown = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  disabled = false,
  maxDisplayChips = 3,
  emptyMessage = 'No options found',
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedSet = new Set(value || []);

  const filteredOptions = options.filter(opt => {
    if (!search) return true;
    const term = search.toLowerCase();
    const matchLabel = opt.label && opt.label.toLowerCase().includes(term);
    const matchSublabel = opt.sublabel && opt.sublabel.toLowerCase().includes(term);
    const matchVal = String(opt.value).toLowerCase().includes(term);
    return matchLabel || matchSublabel || matchVal;
  });

  const handleToggle = (optValue) => {
    if (disabled) return;
    const next = selectedSet.has(optValue)
      ? (value || []).filter(v => v !== optValue)
      : [...(value || []), optValue];
    if (onChange) onChange(next);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const visibleValues = filteredOptions.map(o => o.value);
    const allSelected = visibleValues.every(v => selectedSet.has(v));
    if (allSelected) {
      // Unselect filtered
      const next = (value || []).filter(v => !visibleValues.includes(v));
      if (onChange) onChange(next);
    } else {
      // Select all filtered
      const union = Array.from(new Set([...(value || []), ...visibleValues]));
      if (onChange) onChange(union);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) onChange([]);
  };

  // Find labels of selected items
  const selectedOptions = options.filter(o => selectedSet.has(o.value));

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        style={{
          width: '100%',
          minHeight: '38px',
          padding: '4px 10px',
          background: disabled ? COLORS.background.secondary : '#fff',
          border: `1px solid ${isOpen ? COLORS.brand.primary : COLORS.border.medium}`,
          borderRadius: BORDER_RADIUS.sm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACING.xs,
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: isOpen ? `0 0 0 1px ${COLORS.brand.primary}` : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {selectedOptions.length === 0 ? (
            <span style={{ fontSize: FONT.size.sm, color: COLORS.text.tertiary }}>
              {placeholder}
            </span>
          ) : (
            <>
              {selectedOptions.slice(0, maxDisplayChips).map(opt => (
                <span
                  key={opt.value}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: BORDER_RADIUS.pill,
                    background: COLORS.brand.primary + '15',
                    color: COLORS.brand.primary,
                    fontSize: FONT.size.xs,
                    fontWeight: FONT.weight.medium,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(opt.value);
                  }}
                >
                  <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  <i className="fa-solid fa-xmark" style={{ fontSize: '10px', opacity: 0.7 }} />
                </span>
              ))}

              {selectedOptions.length > maxDisplayChips && (
                <span style={{
                  padding: '2px 6px',
                  borderRadius: BORDER_RADIUS.pill,
                  background: COLORS.background.secondary,
                  color: COLORS.text.secondary,
                  fontSize: FONT.size.xs,
                  fontWeight: FONT.weight.semibold,
                }}>
                  +{selectedOptions.length - maxDisplayChips} more
                </span>
              )}
            </>
          )}
        </div>

        {/* Clear & Caret icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.text.tertiary }}>
          {selectedOptions.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear all"
              style={{
                background: 'none', border: 'none', padding: 0,
                color: COLORS.text.tertiary, cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.status.error}
              onMouseLeave={e => e.currentTarget.style.color = COLORS.text.tertiary}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: '12px' }} />
            </button>
          )}
          <i
            className={`fa-solid fa-chevron-down`}
            style={{
              fontSize: '11px',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: COLORS.background.primary,
            borderRadius: BORDER_RADIUS.md,
            border: `1px solid ${COLORS.border.medium}`,
            boxShadow: SHADOWS.md || '0 10px 15px -3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Bar */}
          <div style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
            background: COLORS.background.secondary,
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: COLORS.text.tertiary, fontSize: '12px' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: FONT.size.xs,
                color: COLORS.text.primary,
                width: '100%',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  border: 'none', background: 'none', color: COLORS.text.tertiary,
                  cursor: 'pointer', padding: 0, display: 'flex',
                }}
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: '11px' }} />
              </button>
            )}
          </div>

          {/* Quick Actions (Select All / Count) */}
          <div style={{
            padding: `4px ${SPACING.sm}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: COLORS.text.secondary,
          }}>
            <span>{selectedOptions.length} of {options.length} selected</span>
            {filteredOptions.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: COLORS.brand.primary, cursor: 'pointer',
                  fontWeight: FONT.weight.medium, fontSize: '11px',
                }}
              >
                {filteredOptions.every(o => selectedSet.has(o.value)) ? 'Deselect Visible' : 'Select All Visible'}
              </button>
            )}
          </div>

          {/* Options List */}
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: `${SPACING.md} ${SPACING.sm}`,
                textAlign: 'center',
                color: COLORS.text.tertiary,
                fontSize: FONT.size.xs,
              }}>
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(opt => {
                const checked = selectedSet.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: BORDER_RADIUS.sm,
                      background: checked ? COLORS.brand.primary + '10' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!checked) e.currentTarget.style.background = COLORS.background.secondary;
                    }}
                    onMouseLeave={e => {
                      if (!checked) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // Handled by label click
                      style={{ cursor: 'pointer', margin: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{
                        fontSize: FONT.size.xs,
                        fontWeight: checked ? FONT.weight.semibold : FONT.weight.medium,
                        color: COLORS.text.primary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {opt.label}
                      </span>
                      {opt.sublabel && (
                        <span style={{
                          fontSize: '10px',
                          color: COLORS.text.tertiary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {checked && (
                      <i className="fa-solid fa-check" style={{ color: COLORS.brand.primary, fontSize: '11px' }} />
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
