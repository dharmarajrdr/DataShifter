import React, { useState, useEffect, useMemo } from 'react';
import { FRBC, FREC } from '../../constants/layouts';
import { Loader } from '../common';
import { CloseIcon } from '../layout/Icons';
import { udfApi } from '../../services/api';

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

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.35)', zIndex: 110 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 111, background: '#fff', borderRadius: '12px',
        boxShadow: '0 16px 40px rgba(0,0,0,.16)', width: '500px', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ ...FRBC, padding: '16px 20px', borderBottom: '1px solid #E8E8E5', background: '#FAFAF9' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>☕ Java UDF Transformation</span>
            </div>
            {targetColumn && (
              <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>
                Target column: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#534AB7' }}>{targetColumn}</span>
              </div>
            )}
          </div>
          <span onClick={onClose} style={{ cursor: 'pointer', color: '#9B9B9B' }}><CloseIcon /></span>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}><Loader message="Loading UDFs..." /></div>
          ) : fetchError ? (
            <div style={{ background: '#FAECE7', border: '1px solid #D85A30', padding: '12px', borderRadius: '8px', color: '#712B13', fontSize: '12px' }}>
              ⚠ {fetchError}
            </div>
          ) : udfs.length === 0 ? (
            <div style={{ border: '1px dashed #D4D4D0', borderRadius: '8px', padding: '30px', textAlign: 'center', color: '#6B6B6B', fontSize: '13px' }}>
              <p style={{ fontWeight: 500, marginBottom: '6px' }}>No Java UDFs available</p>
              <p style={{ fontSize: '12px', color: '#9B9B9B', marginBottom: '16px' }}>Upload your compiled UDF JAR in the UDF Library before using it here.</p>
              <a href="/udfs" style={{ display: 'inline-block', background: '#534AB7', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                Go to UDF Library →
              </a>
            </div>
          ) : (
            <>
              {/* UDF selection & Pinned version */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Select UDF Artifact
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={selectedUdfId}
                    onChange={e => setSelectedUdfId(e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #E8E8E5', fontSize: '13px', background: '#fff' }}
                  >
                    {udfs.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.artifactName || 'JAR'})</option>
                    ))}
                  </select>

                  {/* Pinned version badge */}
                  {selectedUdf && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: '#EEEDFE', border: '1px solid #534AB7', color: '#3C3489',
                      padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, flexShrink: 0
                    }}>
                      <span>📌 Pinned v{selectedUdf.version || '1.0.0'}</span>
                    </div>
                  )}
                </div>
                {selectedUdf?.description && (
                  <p style={{ fontSize: '11px', color: '#9B9B9B', marginTop: '4px' }}>{selectedUdf.description}</p>
                )}
              </div>

              {/* Function / Method selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  UDF Method
                </label>
                {functions.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#D97706', background: '#FEF3C7', padding: '8px', borderRadius: '6px' }}>
                    No `@DataShifterUdf` methods found in this JAR.
                  </div>
                ) : (
                  <select
                    value={selectedMethodName}
                    onChange={e => setSelectedMethodName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E8E8E5', fontSize: '13px', fontFamily: 'monospace', background: '#fff' }}
                  >
                    {functions.map(f => (
                      <option key={f.methodName} value={f.methodName}>
                        {f.returnType || 'void'} {f.methodName}(Row row) — {f.description || f.className}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Row processing information note */}
              <div style={{
                background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px',
                padding: '10px 12px', fontSize: '12px', color: '#0369A1', lineHeight: '1.4'
              }}>
                <span style={{ fontWeight: 600 }}>💡 Full Row Access:</span> The entire <code style={{ fontFamily: 'monospace', background: '#E0F2FE', padding: '1px 4px', borderRadius: '4px' }}>Row</code> is passed to the UDF method. The UDF reads any source column and updates values directly via <code style={{ fontFamily: 'monospace', background: '#E0F2FE', padding: '1px 4px', borderRadius: '4px' }}>row.set(...)</code>.
              </div>

              {/* Failure Policy Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#1A1A1A', marginBottom: '4px' }}>
                  Failure Policy on Error
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { value: 'SKIP_ROW', label: 'Skip Row', desc: 'Drop failed row and continue migration' },
                    { value: 'DEFAULT_VALUE', label: 'Default Value', desc: 'Use fallback value for target column' },
                    { value: 'FAIL_CHUNK', label: 'Fail Chunk', desc: 'Fail current chunk and retry' },
                    { value: 'STOP_PIPELINE', label: 'Stop Pipeline', desc: 'Abort entire migration immediately' },
                  ].map(policy => (
                    <div
                      key={policy.value}
                      onClick={() => setFailurePolicy(policy.value)}
                      style={{
                        border: failurePolicy === policy.value ? '2px solid #534AB7' : '1px solid #D4D4D0',
                        background: failurePolicy === policy.value ? '#EEEDFE' : '#fff',
                        borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 600, color: failurePolicy === policy.value ? '#3C3489' : '#1A1A1A' }}>
                        {policy.label}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B6B6B', marginTop: '2px' }}>
                        {policy.desc}
                      </div>
                    </div>
                  ))}
                </div>

                {failurePolicy === 'DEFAULT_VALUE' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Enter fallback default value (e.g. 0, N/A, null)"
                      value={defaultValue}
                      onChange={e => setDefaultValue(e.target.value)}
                      style={{
                        width: '100%', padding: '6px 10px', border: '1px solid #D4D4D0',
                        borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ ...FREC, gap: '8px', padding: '12px 20px', borderTop: '1px solid #E8E8E5', background: '#FAFAF9' }}>
          <button
            onClick={onClose}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #E8E8E5', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#6B6B6B' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedUdf || !selectedFunction}
            style={{
              padding: '6px 16px', borderRadius: '6px', border: 'none',
              background: (selectedUdf && selectedFunction) ? '#534AB7' : '#D4D4D0',
              color: '#fff', fontSize: '12px', fontWeight: 500,
              cursor: (selectedUdf && selectedFunction) ? 'pointer' : 'not-allowed'
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
