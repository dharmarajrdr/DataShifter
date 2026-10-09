import { useEffect, useMemo, useRef, useState } from 'react';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../constants/design';
import { FRBC, FREC } from '../../constants/layouts';
import { udfApi } from '../../services/api';
import { Loader } from '../common';
import { CloseIcon, InfoIcon } from '../layout/Icons';

const FAILURE_POLICIES = [
  { value: 'SKIP_ROW', label: 'Skip Row', desc: 'Drop failed row and continue pipeline' },
  // { value: 'DEFAULT_VALUE', label: 'Default Value', desc: 'Use fallback value for target column' },
  { value: 'FAIL_CHUNK', label: 'Fail Chunk', desc: 'Fail current chunk and retry batch' },
  { value: 'STOP_PIPELINE', label: 'Stop Pipeline', desc: 'Abort entire migration immediately' },
];

const MethodDropdown = ({ functions, selectedMethodName, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredInfoMethod, setHoveredInfoMethod] = useState(null);
  const dropdownRef = useRef(null);

  const selectedFunction = useMemo(() => {
    return functions.find(f => f.methodName === selectedMethodName) || functions[0] || null;
  }, [functions, selectedMethodName]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <button
        type="button"
        id="udf-method-select"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          height: '38px',
          padding: `${SPACING.xs} 10px`,
          borderRadius: BORDER_RADIUS.md,
          border: `1px solid ${isOpen ? COLORS.brand.primary : COLORS.border.medium}`,
          boxShadow: isOpen ? `0 0 0 3px ${COLORS.brand.primaryLight}` : 'none',
          fontSize: FONT.size.sm,
          fontFamily: 'monospace',
          color: COLORS.text.primary,
          background: COLORS.background.primary,
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => {
          if (!isOpen) e.currentTarget.style.borderColor = COLORS.brand.primaryHover;
        }}
        onMouseLeave={e => {
          if (!isOpen) e.currentTarget.style.borderColor = COLORS.border.medium;
        }}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {selectedFunction
            ? `${selectedFunction.returnType || 'void'} ${selectedFunction.methodName}(Row row)`
            : 'Select method...'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
          {selectedFunction?.description && (
            <div
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
              onClick={e => e.stopPropagation()}
              onMouseEnter={() => setHoveredInfoMethod('selected')}
              onMouseLeave={() => setHoveredInfoMethod(null)}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.brand.primary,
                  cursor: 'help',
                }}
              >
                <InfoIcon size={14} color={COLORS.brand.primary} />
              </span>

              {/* Tooltip for selected method */}
              {hoveredInfoMethod === 'selected' && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 'calc(100% + 8px)',
                    background: '#1A1A1A',
                    color: '#FFFFFF',
                    padding: '6px 10px',
                    borderRadius: BORDER_RADIUS.md,
                    fontSize: FONT.size.xs,
                    fontFamily: FONT.family,
                    whiteSpace: 'normal',
                    width: 'max-content',
                    maxWidth: '260px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                    zIndex: 1050,
                    pointerEvents: 'none',
                    lineHeight: '1.4',
                  }}
                >
                  <div>{selectedFunction.description}</div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: '6px',
                      borderWidth: '4px',
                      borderStyle: 'solid',
                      borderColor: '#1A1A1A transparent transparent transparent',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Chevron */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          >
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke={COLORS.text.secondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: COLORS.background.primary,
            border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.md,
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05)',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {functions.map(f => {
            const isSelected = f.methodName === selectedMethodName;
            return (
              <div
                key={f.methodName}
                onClick={() => {
                  onSelect(f.methodName);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `8px 12px`,
                  cursor: 'pointer',
                  background: isSelected ? COLORS.brand.primaryLight : 'transparent',
                  transition: 'background-color 0.12s ease',
                  borderBottom: `1px solid ${COLORS.border.light}`,
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.background.secondary;
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: FONT.size.sm,
                    color: isSelected ? COLORS.brand.primaryDark : COLORS.text.primary,
                    fontWeight: isSelected ? FONT.weight.semibold : FONT.weight.regular,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {f.returnType || 'void'} {f.methodName}(Row row)
                </span>

                {/* Info Icon with On-Hover description */}
                {f.description && (
                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginLeft: SPACING.xs,
                      flexShrink: 0,
                    }}
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={() => setHoveredInfoMethod(f.methodName)}
                    onMouseLeave={() => setHoveredInfoMethod(null)}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        color: isSelected ? COLORS.brand.primaryDark : COLORS.text.secondary,
                        background: hoveredInfoMethod === f.methodName ? COLORS.border.light : 'transparent',
                        cursor: 'help',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <InfoIcon size={14} color={isSelected ? COLORS.brand.primary : COLORS.text.secondary} />
                    </span>

                    {/* Hover Tooltip displaying f.description */}
                    {hoveredInfoMethod === f.methodName && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          bottom: 'calc(100% + 6px)',
                          background: '#1A1A1A',
                          color: '#FFFFFF',
                          padding: '6px 10px',
                          borderRadius: BORDER_RADIUS.md,
                          fontSize: FONT.size.xs,
                          fontFamily: FONT.family,
                          whiteSpace: 'normal',
                          width: 'max-content',
                          maxWidth: '260px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                          zIndex: 1100,
                          pointerEvents: 'none',
                          lineHeight: '1.4',
                        }}
                      >
                        <div>{f.description}</div>
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: '7px',
                            borderWidth: '4px',
                            borderStyle: 'solid',
                            borderColor: '#1A1A1A transparent transparent transparent',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const UdfPickerModal = ({
  targetColumn,
  sourceTables = [],
  initialConfig = null,
  onApply,
  onClose,
}) => {
  const [udfs, setUdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [selectedUdfId, setSelectedUdfId] = useState(initialConfig?.udfId || '');
  const [selectedMethodName, setSelectedMethodName] = useState(initialConfig?.methodName || '');
  const [failurePolicy, setFailurePolicy] = useState(initialConfig?.failurePolicy || 'SKIP_ROW');
  const [defaultValue, setDefaultValue] = useState(initialConfig?.defaultValue || '');

  // Track focused fields for accessible focus rings
  const [focusedField, setFocusedField] = useState(null);
  const modalRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch all registered UDFs
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await udfApi.getAll();
        if (mounted) {
          const list = res.data || [];
          setUdfs(list);
          if (list.length > 0 && !selectedUdfId) {
            setSelectedUdfId(list[0].id);
            if (list[0].functions?.length > 0) {
              setSelectedMethodName(list[0].functions[0].methodName);
            }
          }
        }
      } catch (err) {
        if (mounted) setFetchError(err.message || 'Failed to load UDFs');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const selectedUdf = useMemo(() => {
    return udfs.find(u => u.id === selectedUdfId) || null;
  }, [udfs, selectedUdfId]);

  const functions = useMemo(() => {
    return selectedUdf?.functions || [];
  }, [selectedUdf]);

  const selectedFunction = useMemo(() => {
    return functions.find(f => f.methodName === selectedMethodName) || functions[0] || null;
  }, [functions, selectedMethodName]);

  // When selected UDF changes, set default function if not selected
  useEffect(() => {
    if (functions.length > 0 && (!selectedMethodName || !functions.some(f => f.methodName === selectedMethodName))) {
      setSelectedMethodName(functions[0].methodName);
    }
  }, [functions, selectedMethodName]);

  const handleApply = () => {
    if (!selectedUdf || !selectedFunction) return;
    const config = {
      udfId: selectedUdf.id,
      udfName: selectedUdf.name,
      version: selectedUdf.version || '1.0.0', // Pin exact version!
      className: selectedFunction.className,
      methodName: selectedFunction.methodName,
      failurePolicy,
      defaultValue: failurePolicy === 'DEFAULT_VALUE' ? defaultValue : undefined,
    };
    onApply(config, null);
    onClose();
  };

  const getSelectStyle = (fieldName) => ({
    width: '100%',
    padding: `${SPACING.xs} 10px`,
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${focusedField === fieldName ? COLORS.brand.primary : COLORS.border.medium}`,
    boxShadow: focusedField === fieldName ? `0 0 0 3px ${COLORS.brand.primaryLight}` : 'none',
    fontSize: FONT.size.sm,
    fontFamily: FONT.family,
    color: COLORS.text.primary,
    background: COLORS.background.primary,
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
    height: '38px',
  });

  const getInputStyle = (fieldName) => ({
    width: '100%',
    padding: `${SPACING.xs} 10px`,
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${focusedField === fieldName ? COLORS.brand.primary : COLORS.border.medium}`,
    boxShadow: focusedField === fieldName ? `0 0 0 3px ${COLORS.brand.primaryLight}` : 'none',
    fontSize: FONT.size.sm,
    fontFamily: FONT.family,
    color: COLORS.text.primary,
    background: COLORS.background.primary,
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
    height: '38px',
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(1px)',
          zIndex: 1000,
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="udf-modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          background: COLORS.background.primary,
          borderRadius: BORDER_RADIUS.lg,
          border: `1px solid ${COLORS.border.light}`,
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08)',
          width: '520px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: FONT.family,
          color: COLORS.text.primary,
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            ...FRBC,
            padding: `${SPACING.md} ${SPACING.lg}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
            background: COLORS.background.secondary,
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              id="udf-modal-title"
              style={{
                fontSize: FONT.size.lg,
                fontWeight: FONT.weight.semibold,
                color: COLORS.text.primary,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.xs,
                lineHeight: '1.2',
              }}
            >
              <span>☕</span>
              <span>Java UDF Transformation</span>
            </h2>
            {targetColumn && (
              <p
                style={{
                  fontSize: FONT.size.sm,
                  color: COLORS.text.secondary,
                  margin: `${SPACING.xxs} 0 0 0`,
                  lineHeight: '1.4',
                }}
              >
                Target column:{' '}
                <code
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: FONT.weight.semibold,
                    color: COLORS.brand.primary,
                    background: COLORS.brand.primaryLight,
                    padding: '1px 6px',
                    borderRadius: BORDER_RADIUS.sm,
                    fontSize: FONT.size.xs,
                  }}
                >
                  {targetColumn}
                </code>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: BORDER_RADIUS.md,
              border: 'none',
              background: 'transparent',
              color: COLORS.text.tertiary,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              outline: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = COLORS.text.primary;
              e.currentTarget.style.backgroundColor = COLORS.border.light;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = COLORS.text.tertiary;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = `0 0 0 2px ${COLORS.brand.primaryLight}`;
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body Content */}
        <div
          style={{
            padding: SPACING.lg,
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.md,
          }}
        >
          {loading ? (
            <div style={{ padding: `${SPACING.xxl} 0`, textAlign: 'center' }}>
              <Loader message="Loading UDFs..." />
            </div>
          ) : fetchError ? (
            <div
              style={{
                background: COLORS.status.errorLight,
                border: `1px solid ${COLORS.status.error}`,
                borderRadius: BORDER_RADIUS.md,
                padding: `${SPACING.sm} ${SPACING.md}`,
                color: COLORS.status.errorDark,
                fontSize: FONT.size.sm,
              }}
            >
              ⚠ {fetchError}
            </div>
          ) : udfs.length === 0 ? (
            <div
              style={{
                border: `1px dashed ${COLORS.border.medium}`,
                borderRadius: BORDER_RADIUS.lg,
                background: COLORS.background.secondary,
                padding: `${SPACING.xl} ${SPACING.lg}`,
                textAlign: 'center',
                color: COLORS.text.secondary,
              }}
            >
              <p
                style={{
                  fontSize: FONT.size.base,
                  fontWeight: FONT.weight.medium,
                  color: COLORS.text.primary,
                  marginBottom: SPACING.xxs,
                }}
              >
                No Java UDFs available
              </p>
              <p
                style={{
                  fontSize: FONT.size.sm,
                  color: COLORS.text.tertiary,
                  marginBottom: SPACING.md,
                }}
              >
                Upload your compiled UDF JAR in the UDF Library before applying it to columns.
              </p>
              <a
                href="/udfs"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: COLORS.brand.primary,
                  color: COLORS.text.inverse,
                  padding: `${SPACING.xs} ${SPACING.md}`,
                  borderRadius: BORDER_RADIUS.md,
                  fontSize: FONT.size.sm,
                  fontWeight: FONT.weight.medium,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <span>Go to UDF Library</span>
                <span>→</span>
              </a>
            </div>
          ) : (
            <>
              {/* UDF Artifact Selection */}
              <div>
                <label
                  htmlFor="udf-artifact-select"
                  style={{
                    display: 'block',
                    fontSize: FONT.size.xs,
                    fontWeight: FONT.weight.semibold,
                    color: COLORS.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: SPACING.xxs,
                  }}
                >
                  Select UDF Artifact
                </label>
                <div style={{ display: 'flex', gap: SPACING.xs, alignItems: 'center' }}>
                  <select
                    id="udf-artifact-select"
                    value={selectedUdfId}
                    onChange={e => setSelectedUdfId(e.target.value)}
                    onFocus={() => setFocusedField('artifact')}
                    onBlur={() => setFocusedField(null)}
                    style={getSelectStyle('artifact')}
                  >
                    {udfs.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.artifactName || 'JAR'})
                      </option>
                    ))}
                  </select>

                  {/* Pinned Version Badge
                  {selectedUdf && (
                    <div
                      title="This specific version will be permanently pinned for pipeline execution reproducibility"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: COLORS.brand.primaryLight,
                        border: `1px solid ${COLORS.brand.primary}`,
                        color: COLORS.brand.primaryDark,
                        padding: `0 ${SPACING.sm}`,
                        height: '38px',
                        borderRadius: BORDER_RADIUS.md,
                        fontSize: FONT.size.xs,
                        fontWeight: FONT.weight.semibold,
                        flexShrink: 0,
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>📌</span>
                      <span>v{selectedUdf.version || '1.0.0'}</span>
                    </div>
                  )} */}
                </div>
                {selectedUdf?.description && (
                  <p
                    style={{
                      fontSize: FONT.size.xs,
                      color: COLORS.text.tertiary,
                      marginTop: SPACING.xxs,
                      marginBottom: 0,
                    }}
                  >
                    {selectedUdf.description}
                  </p>
                )}
              </div>

              {/* Function / Method Selection */}
              <div>
                <label
                  htmlFor="udf-method-select"
                  style={{
                    display: 'block',
                    fontSize: FONT.size.xs,
                    fontWeight: FONT.weight.semibold,
                    color: COLORS.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: SPACING.xxs,
                  }}
                >
                  UDF Method
                </label>
                {functions.length === 0 ? (
                  <div
                    style={{
                      fontSize: FONT.size.sm,
                      color: COLORS.status.warningDark,
                      background: COLORS.status.warningLight,
                      border: `1px solid ${COLORS.status.warning}`,
                      padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.md,
                    }}
                  >
                    ⚠ No methods annotated with <code>@DataShifterUdf</code> were found in this JAR.
                  </div>
                ) : (
                  <MethodDropdown
                    functions={functions}
                    selectedMethodName={selectedMethodName}
                    onSelect={setSelectedMethodName}
                  />
                )}
              </div>

              {/* Failure Policy Selector */}
              <div>
                <label
                  id="failure-policy-label"
                  style={{
                    display: 'block',
                    fontSize: FONT.size.xs,
                    fontWeight: FONT.weight.semibold,
                    color: COLORS.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: SPACING.xxs,
                  }}
                >
                  Failure Policy on Error
                </label>
                <div
                  role="radiogroup"
                  aria-labelledby="failure-policy-label"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: SPACING.xs,
                  }}
                >
                  {FAILURE_POLICIES.map(policy => {
                    const isSelected = failurePolicy === policy.value;
                    return (
                      <div
                        key={policy.value}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => setFailurePolicy(policy.value)}
                        onKeyDown={e => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setFailurePolicy(policy.value);
                          }
                        }}
                        style={{
                          border: isSelected
                            ? `1.5px solid ${COLORS.brand.primary}`
                            : `1px solid ${COLORS.border.medium}`,
                          background: isSelected ? COLORS.brand.primaryLight : COLORS.background.primary,
                          borderRadius: BORDER_RADIUS.md,
                          padding: `${SPACING.xs} ${SPACING.sm}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = COLORS.brand.primary;
                            e.currentTarget.style.backgroundColor = COLORS.background.secondary;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = COLORS.border.medium;
                            e.currentTarget.style.backgroundColor = COLORS.background.primary;
                          }
                        }}
                        onFocus={e => {
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.brand.primaryLight}`;
                          if (!isSelected) e.currentTarget.style.borderColor = COLORS.brand.primary;
                        }}
                        onBlur={e => {
                          e.currentTarget.style.boxShadow = 'none';
                          if (!isSelected) e.currentTarget.style.borderColor = COLORS.border.medium;
                        }}
                      >
                        <div
                          style={{
                            fontSize: FONT.size.sm,
                            fontWeight: isSelected ? FONT.weight.semibold : FONT.weight.medium,
                            color: isSelected ? COLORS.brand.primaryDark : COLORS.text.primary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: isSelected ? COLORS.brand.primary : COLORS.border.medium,
                              flexShrink: 0,
                              transition: 'background-color 0.15s ease',
                            }}
                          />
                          <span>{policy.label}</span>
                        </div>
                        <div
                          style={{
                            fontSize: FONT.size.xs,
                            color: COLORS.text.secondary,
                            marginTop: SPACING.xxs,
                            lineHeight: '1.35',
                            paddingLeft: '14px',
                          }}
                        >
                          {policy.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fallback default value input when DEFAULT_VALUE policy is chosen */}
                {failurePolicy === 'DEFAULT_VALUE' && (
                  <div style={{ marginTop: SPACING.xs }}>
                    <label
                      htmlFor="udf-default-value-input"
                      style={{
                        display: 'block',
                        fontSize: FONT.size.xs,
                        fontWeight: FONT.weight.medium,
                        color: COLORS.text.secondary,
                        marginBottom: SPACING.xxs,
                      }}
                    >
                      Fallback Default Value
                    </label>
                    <input
                      id="udf-default-value-input"
                      type="text"
                      placeholder="e.g. 0, N/A, null"
                      value={defaultValue}
                      onChange={e => setDefaultValue(e.target.value)}
                      onFocus={() => setFocusedField('defaultValue')}
                      onBlur={() => setFocusedField(null)}
                      style={getInputStyle('defaultValue')}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            ...FREC,
            gap: SPACING.xs,
            padding: `${SPACING.md} ${SPACING.lg}`,
            borderTop: `1px solid ${COLORS.border.light}`,
            background: COLORS.background.secondary,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: `${SPACING.xs} ${SPACING.md}`,
              borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${COLORS.border.medium}`,
              background: COLORS.background.primary,
              fontSize: FONT.size.sm,
              fontWeight: FONT.weight.medium,
              color: COLORS.text.secondary,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
              height: '36px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = COLORS.border.dark;
              e.currentTarget.style.color = COLORS.text.primary;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = COLORS.border.medium;
              e.currentTarget.style.color = COLORS.text.secondary;
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = `0 0 0 2px ${COLORS.border.light}`;
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={!selectedUdf || !selectedFunction}
            style={{
              padding: `${SPACING.xs} ${SPACING.lg}`,
              borderRadius: BORDER_RADIUS.md,
              border: 'none',
              background: (selectedUdf && selectedFunction) ? COLORS.brand.primary : COLORS.border.medium,
              color: COLORS.text.inverse,
              fontSize: FONT.size.sm,
              fontWeight: FONT.weight.medium,
              cursor: (selectedUdf && selectedFunction) ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s ease, opacity 0.15s ease',
              outline: 'none',
              height: '36px',
            }}
            onMouseEnter={e => {
              if (selectedUdf && selectedFunction) {
                e.currentTarget.style.backgroundColor = COLORS.brand.primaryHover;
              }
            }}
            onMouseLeave={e => {
              if (selectedUdf && selectedFunction) {
                e.currentTarget.style.backgroundColor = COLORS.brand.primary;
              }
            }}
            onFocus={e => {
              if (selectedUdf && selectedFunction) {
                e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.brand.primaryLight}`;
              }
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Apply UDF
          </button>
        </div>
      </div>
    </>
  );
};

export default UdfPickerModal;
