import { useRef, useState } from 'react';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS, SPACING } from '../../constants/design';
import { FRSC } from '../../constants/layouts';
import { useNotification } from '../../contexts/NotificationContext';
import { pipelineApi } from '../../services/api';
import { Button, ConfirmationModal, ProgressBar, SpinnerLoader } from '../common';

export const ImportPipelineModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [jsonConfig, setJsonConfig] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [stage, setStage] = useState('select'); // 'select' | 'importing' | 'summary' | 'error'
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  const fileInputRef = useRef(null);
  const notification = useNotification();

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setJsonConfig(null);
    setValidationError(null);
    setStage('select');
    setProgressPercent(0);
    setProgressMessage('');
    setImportResult(null);
    setIsRollingBack(false);
    setShowRollbackConfirm(false);
  };

  const handleClose = () => {
    if (stage === 'importing' || isRollingBack) return;
    handleReset();
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setValidationError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = JSON.parse(text);

        // Pre-validation
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON format: root must be an object.');
        }
        if (!parsed.pipeline) {
          throw new Error('Invalid pipeline configuration: missing required "pipeline" object.');
        }
        if (!parsed.pipeline.name || !parsed.pipeline.name.trim()) {
          throw new Error('Invalid pipeline configuration: missing pipeline "name".');
        }
        if (!parsed.pipeline.sourceConnectionName || !parsed.pipeline.sourceConnectionName.trim()) {
          throw new Error('Invalid pipeline configuration: missing "sourceConnectionName".');
        }
        if (!parsed.pipeline.targetConnectionName || !parsed.pipeline.targetConnectionName.trim()) {
          throw new Error('Invalid pipeline configuration: missing "targetConnectionName".');
        }

        setJsonConfig(parsed);
      } catch (err) {
        setValidationError(err.message || 'Failed to parse JSON file.');
        setJsonConfig(null);
      }
    };
    reader.onerror = () => {
      setValidationError('Failed to read file from disk.');
      setJsonConfig(null);
    };
    reader.readAsText(selectedFile);
  };

  const handleStartImport = async () => {
    if (!jsonConfig) return;

    setStage('importing');
    setProgressPercent(20);
    setProgressMessage('Validating JSON structure and resolving connections...');

    try {
      await new Promise(r => setTimeout(r, 400));
      setProgressPercent(50);
      setProgressMessage('Checking connections and creating pipeline schema...');

      const response = await pipelineApi.import(jsonConfig);
      const resData = response.data;

      if (!resData || resData.success === false) {
        setImportResult(resData || { errors: ['Import failed'] });
        setStage('error');
        setProgressMessage('Import failed with errors.');
        return;
      }

      setProgressPercent(90);
      setProgressMessage('Configuring table mappings and transformations...');
      await new Promise(r => setTimeout(r, 300));

      setProgressPercent(100);
      setProgressMessage('Import completed successfully!');
      setImportResult(resData);
      setStage('summary');
      if (onImportSuccess) onImportSuccess(resData);
      notification.success(`Pipeline "${resData.pipelineName}" imported successfully`);
      handleClose();
    } catch (err) {
      setImportResult({
        success: false,
        errors: [err.message || 'Import request failed unexpectedly.'],
      });
      setStage('error');
    }
  };

  const executeRollback = async () => {
    setShowRollbackConfirm(false);
    setIsRollingBack(true);
    try {
      await pipelineApi.rollback({
        pipelineId: importResult?.pipelineId,
        createdConnectionIds: importResult?.createdConnectionIds || [],
      });
      notification.success('Import session successfully rolled back.');
      handleClose();
      if (onImportSuccess) onImportSuccess(null);
    } catch (err) {
      notification.error(err.message || 'Failed to rollback import session.');
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(2px)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && stage !== 'importing' && !isRollingBack) {
            handleClose();
          }
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: COLORS.background.primary,
            borderRadius: BORDER_RADIUS.lg,
            boxShadow: SHADOWS.lg,
            border: `1px solid ${COLORS.border.light}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: `${SPACING.md} ${SPACING.lg}`,
              borderBottom: `1px solid ${COLORS.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              id="import-modal-title"
              style={{
                margin: 0,
                fontSize: FONT.size.lg,
                fontWeight: 600,
                color: COLORS.text.primary,
              }}
            >
              {stage === 'summary' ? 'Import Summary' : 'Import Pipeline Configuration'}
            </h3>
            {stage !== 'importing' && !isRollingBack && (
              <button
                onClick={handleClose}
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: COLORS.text.secondary,
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: SPACING.lg, maxHeight: '65vh', overflowY: 'auto' }}>
            {stage === 'select' && (
              <div>
                <p style={{ margin: `0 0 ${SPACING.md} 0`, fontSize: FONT.size.sm, color: COLORS.text.secondary }}>
                  Select an exported JSON configuration file to create connections, pipeline tables, and column transformations.
                </p>

                <div
                  style={{
                    border: `2px dashed ${validationError ? COLORS.status.errorDark : COLORS.border.medium}`,
                    borderRadius: BORDER_RADIUS.md,
                    padding: SPACING.xl,
                    textAlign: 'center',
                    backgroundColor: COLORS.background.secondary,
                    cursor: 'pointer',
                    marginBottom: SPACING.md,
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div style={{ fontSize: '32px', marginBottom: SPACING.xs }}>📄</div>
                  <div style={{ fontSize: FONT.size.md, fontWeight: 500, color: COLORS.text.primary, marginBottom: '4px' }}>
                    {file ? file.name : 'Click to browse or drop JSON file here'}
                  </div>
                  <div style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                    Accepts valid DataShifter .json exports
                  </div>
                </div>

                {validationError && (
                  <div
                    style={{
                      background: '#FAECE7',
                      border: `1px solid ${COLORS.status.errorDark}`,
                      color: COLORS.status.errorDark,
                      padding: `${SPACING.sm} ${SPACING.md}`,
                      borderRadius: BORDER_RADIUS.sm,
                      fontSize: FONT.size.xs,
                      marginBottom: SPACING.md,
                    }}
                  >
                    <strong>Validation Error:</strong> {validationError}
                  </div>
                )}

                {jsonConfig && !validationError && (
                  <div
                    style={{
                      background: COLORS.background.secondary,
                      border: `1px solid ${COLORS.border.light}`,
                      borderRadius: BORDER_RADIUS.sm,
                      padding: SPACING.md,
                      fontSize: FONT.size.xs,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '6px', color: COLORS.text.primary }}>Configuration Preview:</div>
                    <div style={{ ...FRSC, gap: SPACING.sm, marginBottom: '4px' }}>
                      <span style={{ color: COLORS.text.tertiary, width: '130px' }}>Pipeline Name:</span>
                      <strong style={{ color: COLORS.text.primary }}>{jsonConfig.pipeline.name}</strong>
                    </div>
                    <div style={{ ...FRSC, gap: SPACING.sm, marginBottom: '4px' }}>
                      <span style={{ color: COLORS.text.tertiary, width: '130px' }}>Source Connection:</span>
                      <span>{jsonConfig.pipeline.sourceConnectionName}</span>
                    </div>
                    <div style={{ ...FRSC, gap: SPACING.sm, marginBottom: '4px' }}>
                      <span style={{ color: COLORS.text.tertiary, width: '130px' }}>Target Connection:</span>
                      <span>{jsonConfig.pipeline.targetConnectionName}</span>
                    </div>
                    <div style={{ ...FRSC, gap: SPACING.sm }}>
                      <span style={{ color: COLORS.text.tertiary, width: '130px' }}>Tables Configured:</span>
                      <span>{jsonConfig.pipeline.tables?.length || 0} table(s)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {stage === 'importing' && (
              <div style={{ textAlign: 'center', padding: `${SPACING.lg} 0` }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: SPACING.lg }}>
                  <SpinnerLoader size={44} />
                </div>
                <h4 style={{ margin: `0 0 ${SPACING.xs} 0`, fontSize: FONT.size.md, color: COLORS.text.primary }}>
                  Importing Pipeline...
                </h4>
                <p style={{ margin: `0 0 ${SPACING.lg} 0`, fontSize: FONT.size.sm, color: COLORS.text.secondary }}>
                  {progressMessage}
                </p>
                <ProgressBar progress={progressPercent} />
              </div>
            )}

            {stage === 'summary' && importResult && (
              <div>
                <div
                  style={{
                    background: '#E8F5E9',
                    border: '1px solid #4CAF50',
                    borderRadius: BORDER_RADIUS.sm,
                    padding: SPACING.md,
                    marginBottom: SPACING.md,
                    color: '#2E7D32',
                    fontSize: FONT.size.sm,
                    fontWeight: 500,
                  }}
                >
                  ✓ Pipeline "{importResult.pipelineName}" imported successfully.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm, marginBottom: SPACING.md }}>
                  <div style={{ background: COLORS.background.secondary, padding: SPACING.sm, borderRadius: BORDER_RADIUS.sm }}>
                    <div style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>Tables</div>
                    <div style={{ fontSize: FONT.size.lg, fontWeight: 600 }}>{importResult.tablesCount}</div>
                  </div>
                  <div style={{ background: COLORS.background.secondary, padding: SPACING.sm, borderRadius: BORDER_RADIUS.sm }}>
                    <div style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>Column Mappings</div>
                    <div style={{ fontSize: FONT.size.lg, fontWeight: 600 }}>{importResult.columnMappingsCount}</div>
                  </div>
                </div>

                {/* Connections info */}
                <div style={{ marginBottom: SPACING.md, fontSize: FONT.size.xs }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: COLORS.text.primary }}>Connections Status:</div>
                  {importResult.existingConnectionNames?.length > 0 && (
                    <div style={{ color: COLORS.text.secondary, marginBottom: '2px' }}>
                      • Existing connections reused (skipped duplicate creation): <strong>{importResult.existingConnectionNames.join(', ')}</strong>
                    </div>
                  )}
                  {importResult.createdConnectionNames?.length > 0 && (
                    <div style={{ color: COLORS.brand.primary, marginBottom: '2px' }}>
                      • New connections created (empty password): <strong>{importResult.createdConnectionNames.join(', ')}</strong>
                    </div>
                  )}
                </div>

                {/* Warnings */}
                {importResult.warnings?.length > 0 && (
                  <div
                    style={{
                      background: '#FFF9E6',
                      border: '1px solid #FFE082',
                      borderRadius: BORDER_RADIUS.sm,
                      padding: SPACING.sm,
                      fontSize: FONT.size.xs,
                      color: '#8D6E63',
                    }}
                  >
                    <strong>Notice:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {importResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {stage === 'error' && (
              <div>
                <div
                  style={{
                    background: '#FAECE7',
                    border: `1px solid ${COLORS.status.errorDark}`,
                    borderRadius: BORDER_RADIUS.sm,
                    padding: SPACING.md,
                    marginBottom: SPACING.md,
                    color: COLORS.status.errorDark,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: FONT.size.sm, marginBottom: '4px' }}>
                    Import Failed
                  </div>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: FONT.size.xs }}>
                    {importResult?.errors?.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>

                <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>
                  If connections or partial data were created during this attempt, you can roll them back using the button below.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: `${SPACING.md} ${SPACING.lg}`,
              borderTop: `1px solid ${COLORS.border.light}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: SPACING.sm,
              backgroundColor: COLORS.background.secondary,
            }}
          >
            {stage === 'select' && (
              <>
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={!jsonConfig || !!validationError}
                  onClick={handleStartImport}
                >
                  Start Import
                </Button>
              </>
            )}

            {stage === 'summary' && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowRollbackConfirm(true)}
                  disabled={isRollingBack}
                >
                  Rollback Import
                </Button>
                <Button variant="primary" onClick={handleClose}>
                  Done
                </Button>
              </>
            )}

            {stage === 'error' && (
              <>
                <Button variant="secondary" onClick={handleClose}>
                  Close
                </Button>
                {(importResult?.pipelineId || (importResult?.createdConnectionIds && importResult.createdConnectionIds.length > 0)) && (
                  <Button
                    variant="danger"
                    onClick={() => setShowRollbackConfirm(true)}
                    disabled={isRollingBack}
                  >
                    Rollback Changes
                  </Button>
                )}
                <Button variant="primary" onClick={handleReset}>
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal before rollback */}
      <ConfirmationModal
        isOpen={showRollbackConfirm}
        title="Confirm Rollback"
        message="Are you sure you want to rollback this import? This will delete the newly created pipeline and any connections created during this import session."
        actions={[
          { label: 'Cancel', onClick: () => setShowRollbackConfirm(false), variant: 'secondary' },
          { label: 'Confirm Rollback', onClick: executeRollback, variant: 'danger', loading: isRollingBack },
        ]}
        onClose={() => setShowRollbackConfirm(false)}
      />
    </>
  );
};
export default ImportPipelineModal;
