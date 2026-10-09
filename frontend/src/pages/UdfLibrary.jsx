import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock3, Code2, Columns, FileCode2, Info, ShieldCheck, Trash2, Upload, Workflow, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiGuard, Button, Chip, Loader, PageHeader } from '../components/common';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS, SPACING } from '../constants/design';
import { FRBC, FREC, FRSC } from '../constants/layouts';
import { useAuth } from '../contexts/AuthContext';
import { udfApi } from '../services/api';

const inputStyle = {
    width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${COLORS.border.light}`,
    borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box',
    background: COLORS.background.primary,
};

const STATUS_META = {
    READY: { label: 'Ready', color: COLORS.status.successText, background: COLORS.status.successLight, icon: CheckCircle2 },
    VALIDATING: { label: 'Validating', color: COLORS.status.warningText, background: COLORS.status.warningLight, icon: Clock3 },
    FAILED: { label: 'Validation failed', color: COLORS.status.errorText, background: COLORS.status.errorLight, icon: AlertTriangle },
};

const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StatusChip = ({ status }) => {
    const meta = STATUS_META[status] || STATUS_META.VALIDATING;
    const Icon = meta.icon;
    return (
        <span style={{ ...FRSC, gap: '4px', padding: '4px 8px', borderRadius: BORDER_RADIUS.pill, background: meta.background, color: meta.color, fontSize: FONT.size.xs, fontWeight: FONT.weight.medium }}>
            <Icon size={12} /> {meta.label}
        </span>
    );
};

const UploadModal = ({ onClose, onUploaded }) => {
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);

    const chooseFile = (selected) => {
        const next = selected?.[0];
        if (!next) return;
        if (!next.name.toLowerCase().endsWith('.jar')) {
            setError('Only Java .jar files are accepted.');
            return;
        }
        setError(null);
        setFile(next);
        if (!name) setName(next.name.replace(/\.jar$/i, ''));
    };

    const handleSubmit = async () => {
        if (!name.trim()) return setError('Enter a name for this UDF.');
        if (!file) return setError('Choose a Java .jar file to upload.');
        setUploading(true);
        setError(null);
        try {
            const response = await udfApi.upload(file, { name: name.trim(), description: description.trim() });
            onUploaded(response.data);
            onClose();
        } catch (err) {
            setError(err.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div role="dialog" aria-modal="true" aria-labelledby="udf-upload-title" onClick={e => e.stopPropagation()} style={{ background: COLORS.background.primary, borderRadius: BORDER_RADIUS.lg, width: '520px', maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', overflow: 'auto', border: `1px solid ${COLORS.border.light}`, boxShadow: SHADOWS.md }}>
                <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                    <div>
                        <p id="udf-upload-title" style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium }}>Upload Java UDF</p>
                        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px' }}>Register a JAR for validation before it can be used in a pipeline.</p>
                    </div>
                    <button aria-label="Close upload dialog" onClick={onClose} style={{ border: 0, background: 'transparent', color: COLORS.text.tertiary, cursor: 'pointer' }}><X size={18} /></button>
                </div>

                <div style={{ padding: SPACING.lg }}>
                    <label style={{ display: 'block', fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.xxs }}>UDF name <span style={{ color: COLORS.status.error }}>*</span></label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., customer-eligibility" style={{ ...inputStyle, marginBottom: SPACING.md }} />

                    <label style={{ display: 'block', fontSize: FONT.size.sm, color: COLORS.text.secondary, marginBottom: SPACING.xxs }}>Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What does this function calculate?" style={{ ...inputStyle, resize: 'vertical', marginBottom: SPACING.md }} />

                    <input ref={inputRef} type="file" accept=".jar,application/java-archive" onChange={e => chooseFile(e.target.files)} style={{ display: 'none' }} />
                    <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); chooseFile(e.dataTransfer.files); }} style={{ padding: SPACING.xl, border: `1px dashed ${file ? COLORS.status.success : COLORS.brand.primary}`, borderRadius: BORDER_RADIUS.md, background: file ? COLORS.status.successLight : COLORS.brand.primaryLight, textAlign: 'center', cursor: 'pointer' }}>
                        <FileCode2 size={28} color={file ? COLORS.status.successDark : COLORS.brand.primary} />
                        <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: COLORS.text.primary, marginTop: SPACING.xs }}>{file ? file.name : 'Choose or drop a Java JAR'}</p>
                        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '4px' }}>{file ? formatBytes(file.size) : 'JAR files only'}</p>
                    </div>

                    <div style={{ ...FRSC, gap: SPACING.xs, padding: `${SPACING.sm} 0`, color: COLORS.text.secondary, fontSize: FONT.size.xs }}><ShieldCheck size={14} color={COLORS.status.success} /> The backend will validate the artifact before publishing it.</div>
                    {error && <div role="alert" style={{ background: COLORS.status.errorLight, color: COLORS.status.errorText, padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, marginBottom: SPACING.sm }}>{error}</div>}

                    <div style={{ ...FREC, gap: SPACING.xs, paddingTop: SPACING.sm, borderTop: `1px solid ${COLORS.border.light}` }}>
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={uploading} style={uploading ? { opacity: 0.6 } : {}}>{uploading ? 'Uploading...' : 'Upload UDF'}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FunctionRow = ({ fn }) => {
    const [showInfo, setShowInfo] = useState(false);
    const signature = `${fn.className}.${fn.methodName}(${(fn.parameterTypes || []).join(', ')}) : ${fn.returnType}`;
    return (
        <div style={{ ...FRBC, position: 'relative', padding: '4px 0', borderBottom: `1px solid ${COLORS.border.light}` }}>
            <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>{fn.functionName}</span>
            <button type="button" aria-label={`Details for ${fn.functionName}`} aria-describedby={showInfo ? `udf-function-${fn.id}` : undefined} onMouseEnter={() => setShowInfo(true)} onMouseLeave={() => setShowInfo(false)} onFocus={() => setShowInfo(true)} onBlur={() => setShowInfo(false)} style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: BORDER_RADIUS.pill, background: showInfo ? COLORS.brand.primaryLight : 'transparent', color: COLORS.brand.primary, cursor: 'help' }}><Info size={12} /></button>
            {showInfo && <div id={`udf-function-${fn.id}`} role="tooltip" style={{ position: 'absolute', zIndex: 20, right: 0, top: 'calc(100% - 2px)', width: 280, padding: SPACING.sm, background: COLORS.text.primary, color: COLORS.text.inverse, borderRadius: BORDER_RADIUS.md, boxShadow: SHADOWS.md, pointerEvents: 'none' }}>
                <p style={{ fontSize: FONT.size.xs, fontFamily: 'monospace', lineHeight: 1.5, wordBreak: 'break-word' }}>{signature}</p>
                {fn.description && <p style={{ fontSize: FONT.size.xs, color: '#D4D4D0', lineHeight: 1.4, marginTop: SPACING.xs }}>{fn.description}</p>}
            </div>}
        </div>
    );
};

const UdfCard = ({ udf, canDelete, deleting, onDelete }) => {
    const [showFunctions, setShowFunctions] = useState(false);
    const functions = udf.functions || [];
    const ToggleIcon = showFunctions ? ChevronUp : ChevronDown;
    const isReferenced = (Number(udf.pipelineCount) > 0) || (Number(udf.columnCount) > 0);
    const deleteDisabled = deleting || isReferenced;
    return (
        <div style={{ background: COLORS.background.primary, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, boxShadow: SHADOWS.sm }}>
            <div style={{ ...FRBC, alignItems: 'flex-start', gap: SPACING.md }}>
                <div style={{ ...FRSC, gap: SPACING.sm, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: BORDER_RADIUS.md, background: COLORS.brand.primaryLight, color: COLORS.brand.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Code2 size={18} /></div>
                    <div style={{ minWidth: 0 }}><p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{udf.name}</p><p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px' }}>Version {udf.version || '1.0.0'} · Java</p></div>
                </div>
                <div style={{ ...FRSC, gap: SPACING.xs }}>
                    <StatusChip status={udf.status} />
                    {canDelete && (
                        <button
                            type="button"
                            aria-label={`Delete ${udf.name}`}
                            title={isReferenced ? `Cannot delete: referenced in ${udf.pipelineCount || 0} pipeline(s) and ${udf.columnCount || 0} column(s)` : (deleting ? 'Deleting...' : 'Delete UDF')}
                            onClick={deleteDisabled ? undefined : () => onDelete(udf)}
                            disabled={deleteDisabled}
                            style={{
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${COLORS.border.light}`,
                                borderRadius: BORDER_RADIUS.sm,
                                background: 'transparent',
                                color: isReferenced ? COLORS.text.tertiary : COLORS.status.errorDark,
                                cursor: deleteDisabled ? 'not-allowed' : 'pointer',
                                opacity: isReferenced ? 0.35 : (deleting ? 0.5 : 1)
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
            <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, lineHeight: 1.5, minHeight: '42px', margin: `${SPACING.md} 0` }}>{udf.description || 'No description provided.'}</p>
            <div style={{ borderTop: `1px solid ${COLORS.border.light}`, marginTop: SPACING.md }}>
                <div onClick={() => setShowFunctions(!showFunctions)} style={{ ...FRBC, cursor: 'pointer', padding: `${SPACING.sm} 0 ${showFunctions ? SPACING.xs : 0}`, userSelect: 'none', color: COLORS.text.secondary }}>
                    <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium }}>{functions.length} callable function{functions.length !== 1 ? 's' : ''}</span>
                    <ToggleIcon size={14} color={COLORS.text.tertiary} />
                </div>
                {showFunctions && (
                    <div style={{ paddingBottom: SPACING.xs }}>
                        {functions.length === 0 ? <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, paddingTop: SPACING.xs }}>No annotated public methods discovered.</p> : functions.map(fn => <FunctionRow key={fn.id || `${fn.className}.${fn.methodName}`} fn={fn} />)}
                    </div>
                )}
            </div>
            <div style={{ ...FRBC, borderTop: `1px solid ${COLORS.border.light}`, paddingTop: SPACING.sm, color: COLORS.text.tertiary, fontSize: FONT.size.xs, marginTop: showFunctions ? 0 : SPACING.sm }}>
                <div style={{ ...FRSC, gap: SPACING.sm }}>
                    <span>{formatBytes(udf.sizeBytes)}</span>
                    <span style={{ color: COLORS.border.medium }}>·</span>
                    <span title={`${udf.pipelineCount ?? 0} pipelines referencing`} style={{ ...FRSC, gap: '4px', color: COLORS.text.secondary }}>
                        <Workflow size={13} color={COLORS.text.tertiary} />
                        <span>{udf.pipelineCount ?? 0}</span>
                    </span>
                    <span title={`${udf.columnCount ?? 0} columns referencing`} style={{ ...FRSC, gap: '4px', color: COLORS.text.secondary }}>
                        <Columns size={13} color={COLORS.text.tertiary} />
                        <span>{udf.columnCount ?? 0}</span>
                    </span>
                </div>
                <span>{udf.updatedAt ? new Date(udf.updatedAt).toLocaleDateString() : 'Not published'}</span>
            </div>
        </div>
    );
};

const UdfLibrary = () => {
    const { hasPermission } = useAuth();
    const [udfs, setUdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const canDelete = hasPermission('udf:delete');

    useEffect(() => {
        udfApi.getAll().then(response => setUdfs(response.data || [])).catch(setError).finally(() => setLoading(false));
    }, []);

    const handleDelete = async (udf) => {
        if ((Number(udf.pipelineCount) > 0) || (Number(udf.columnCount) > 0)) return;
        if (!window.confirm(`Delete UDF "${udf.name}"? This cannot be undone.`)) return;
        setDeletingId(udf.id);
        setError(null);
        try {
            await udfApi.delete(udf.id);
            setUdfs(prev => prev.filter(item => item.id !== udf.id));
        } catch (err) {
            setError(err);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <ApiGuard error={error} loading={loading} loadingComponent={<Loader variant="line" />}>
            <div>
                <PageHeader title="UDF library" subtitle="Manage Java functions that can be used in your migration pipelines" actions={<Button onClick={() => setShowUpload(true)}><Upload size={14} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }} /> Upload UDF</Button>} />
                <div style={{ ...FRBC, padding: `${SPACING.sm} ${SPACING.md}`, background: COLORS.background.secondary, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg }}>
                    <div style={{ ...FRSC, gap: SPACING.xs, fontSize: FONT.size.xs, color: COLORS.text.secondary }}><ShieldCheck size={14} color={COLORS.status.success} /><span>Only Java JARs are accepted and every upload is validated.</span></div>
                    <Chip label={`${udfs.length} UDF${udfs.length === 1 ? '' : 's'}`} colorScheme="purple" />
                </div>
                {udfs.length === 0 ? (
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: COLORS.text.secondary, border: `1px dashed ${COLORS.border.medium}`, borderRadius: BORDER_RADIUS.lg }}>
                        <Code2 size={32} color={COLORS.brand.primary} />
                        <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, color: COLORS.text.primary, margin: `${SPACING.sm} 0 ${SPACING.xs}` }}>No UDFs yet</p>
                        <p style={{ fontSize: FONT.size.sm, marginBottom: SPACING.md }}>Upload a Java function to reuse custom business rules across pipelines.</p>
                        <Button onClick={() => setShowUpload(true)}>Upload your first UDF</Button>
                    </div>
                ) : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SPACING.md }}>{udfs.map(udf => <UdfCard key={udf.id} udf={udf} canDelete={canDelete} deleting={deletingId === udf.id} onDelete={handleDelete} />)}</div>}
                {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={udf => setUdfs(prev => [udf, ...prev])} />}
            </div>
        </ApiGuard>
    );
};

export default UdfLibrary;