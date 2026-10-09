import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRBC, FRSC, FREC } from '../../constants/layouts';
import { Button, Loader } from '../common';
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
  const [selectedInputColumns, setSelectedInputColumns] = useState(initialConfig?.inputColumns || []);

  const [previewInput, setPreviewInput] = useState({});
  const [previewResult, setPreviewResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState(null);

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

  // Flatten all source columns
  const allSourceColumns = useMemo(() => {
    const list = [];
    sourceTables.forEach(t => {
      (t.columns || []).forEach(c => {
        list.push({
          table: t.tableName,
          name: c.name,
          type: c.type || c.dataType || 'STRING',
        });
      });
    });
    return list;
  }, [sourceTables]);

  // Default select input column if none selected (e.g. column with matching or similar name)
  useEffect(() => {
    if (selectedInputColumns.length === 0 && allSourceColumns.length > 0) {
      const match = allSourceColumns.find(c => c.name.toLowerCase() === (targetColumn || '').toLowerCase()) || allSourceColumns[0];
      if (match) {
        setSelectedInputColumns([match.name]);
      }
    }
  }, [allSourceColumns, targetColumn]);

  // Sync sample inputs when input columns change
  useEffect(() => {
    setPreviewInput(prev => {
      const updated = { ...prev };
      selectedInputColumns.forEach(col => {
        if (updated[col] === undefined) {
          const meta = allSourceColumns.find(c => c.name === col);
          const t = (meta?.type || '').toUpperCase();
          if (t.includes('INT') || t.includes('NUMBER')) updated[col] = 25;
          else if (t.includes('BOOL')) updated[col] = true;
          else if (t.includes('DATE')) updated[col] = '2026-01-01';
          else updated[col] = 'sample_value';
        }
      });
      return updated;
    });
  }, [selectedInputColumns, allSourceColumns]);

  const toggleInputColumn = (colName) => {
    setSelectedInputColumns(prev => {
      if (prev.includes(colName)) {
        return prev.filter(c => c !== colName);
      }
      return [...prev, colName];
    });
  };

  const handleTest = async () => {
    if (!selectedUdf || !selectedFunction) return;
    setTesting(true);
    setTestError(null);
    setPreviewResult(null);
    try {
      const payload = {
        className: selectedFunction.className,
        methodName: selectedFunction.methodName,
        inputData: previewInput,
      };
      const res = await udfApi.test(selectedUdf.id, payload);
      setPreviewResult(res.data);
    } catch (err) {
      setTestError(err.message || 'Execution failed');
    } finally {
      setTesting(false);
    }
  };

  const handleApply = () => {
    if (!selectedUdf || !selectedFunction) return;
    const config = {
      udfId: selectedUdf.id,
      udfName: selectedUdf.name,
      version: selectedUdf.version || '1.0.0', // Pin exact version!
      className: selectedFunction.className,
      methodName: selectedFunction.methodName,
      inputColumns: selectedInputColumns,
    };
    onApply(config, selectedInputColumns[0] || null);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.35)', zIndex: 110 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 111, background: '#fff', borderRadius: '12px',
        boxShadow: '0 16px 40px rgba(0,0,0,.16)', width: '560px', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ ...FRBC, padding: '16px 20px', borderBottom: '1px solid #E8E8E5', background: '#FAFAF9' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>☕ Java UDF Transformation</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>
              Target column: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#534AB7' }}>{targetColumn}</span>
            </div>
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

              {/* Source Input Column Selection */}
              <div>
                <div style={{ ...FRBC, marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Select Input Columns for Row
                  </label>
                  <span style={{ fontSize: '11px', color: '#9B9B9B' }}>
                    {selectedInputColumns.length} selected
                  </span>
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px',
                  background: '#F7F7F5', borderRadius: '8px', border: '1px solid #E8E8E5', maxHeight: '110px', overflowY: 'auto'
                }}>
                  {allSourceColumns.map(col => {
                    const isSelected = selectedInputColumns.includes(col.name);
                    return (
                      <div
                        key={`${col.table}.${col.name}`}
                        onClick={() => toggleInputColumn(col.name)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px',
                          borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace',
                          background: isSelected ? '#534AB7' : '#fff',
                          color: isSelected ? '#fff' : '#1A1A1A',
                          border: isSelected ? '1px solid #534AB7' : '1px solid #D4D4D0',
                          userSelect: 'none'
                        }}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{col.name}</span>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>({col.type})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview & Test Box */}
              <div style={{ border: '1px solid #E8E8E5', borderRadius: '8px', padding: '12px', background: '#FAFAF9' }}>
                <div style={{ ...FRBC, marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A1A' }}>
                    🧪 Live Input / Output Preview
                  </span>
                  <button
                    onClick={handleTest}
                    disabled={testing || !selectedUdf || !selectedFunction}
                    style={{
                      background: testing ? '#D4D4D0' : '#085041', color: '#fff', border: 'none',
                      padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, cursor: testing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {testing ? 'Testing...' : '▶ Run Test Preview'}
                  </button>
                </div>

                {/* Sample row input fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                  {selectedInputColumns.map(col => (
                    <div key={col}>
                      <span style={{ display: 'block', fontSize: '10px', color: '#6B6B6B', fontFamily: 'monospace', marginBottom: '2px' }}>
                        {col}:
                      </span>
                      <input
                        value={previewInput[col] !== undefined ? previewInput[col] : ''}
                        onChange={e => setPreviewInput({ ...previewInput, [col]: e.target.value })}
                        placeholder="Value"
                        style={{ width: '100%', padding: '4px 6px', border: '1px solid #D4D4D0', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>

                {/* Test Result Display */}
                {testError && (
                  <div style={{ background: '#FAECE7', border: '1px solid #D85A30', padding: '8px', borderRadius: '6px', color: '#A32D2D', fontSize: '11px' }}>
                    ⚠ {testError}
                  </div>
                )}
                {previewResult && (
                  <div style={{ background: '#1A1A1A', color: '#E1F5EE', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', fontFamily: 'monospace', overflowX: 'auto' }}>
                    <div style={{ color: '#1D9E75', fontWeight: 600, marginBottom: '4px' }}>✓ Output Row:</div>
                    <pre style={{ margin: 0 }}>{JSON.stringify(previewResult, null, 2)}</pre>
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
