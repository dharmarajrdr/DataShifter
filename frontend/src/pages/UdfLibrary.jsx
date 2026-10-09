import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock3, Code2, FileCode2, ShieldCheck, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiGuard, Button, Chip, Loader, PageHeader } from '../components/common';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS, SPACING } from '../constants/design';
import { FRBC, FREC, FRSC } from '../constants/layouts';
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

const UdfCard = ({ udf }) => {
    const [showFunctions, setShowFunctions] = useState(false);
    const functions = udf.functions || [];
    return (
        <div style={{ background: COLORS.background.primary, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, boxShadow: SHADOWS.sm }}>
            <div style={{ ...FRBC, alignItems: 'flex-start', gap: SPACING.md }}>
                <div style={{ ...FRSC, gap: SPACING.sm, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: BORDER_RADIUS.md, background: COLORS.brand.primaryLight, color: COLORS.brand.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Code2 size={18} /></div>
                    <div style={{ minWidth: 0 }}><p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{udf.name}</p><p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px' }}>Version {udf.version || '1.0.0'} · Java</p></div>
                </div>
                <StatusChip status={udf.status} />
            </div>
            <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, lineHeight: 1.5, minHeight: '42px', margin: `${SPACING.md} 0` }}>{udf.description || 'No description provided.'}</p>
            <button type="button" onClick={() => setShowFunctions(value => !value)} aria-expanded={showFunctions} style={{ ...FRBC, width: '100%', padding: `${SPACING.xs} 0`, border: 0, borderTop: `1px solid ${COLORS.border.light}`, background: 'transparent', color: COLORS.brand.primary, cursor: 'pointer', fontSize: FONT.size.xs }}>
                <span>{functions.length} callable function{functions.length === 1 ? '' : 's'}</span>
                {showFunctions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showFunctions && <div style={{ marginTop: SPACING.xs, padding: SPACING.xs, background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.sm }}>
                {functions.length === 0 ? <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>No annotated public methods discovered.</p> : functions.map(fn => (
                    <div key={fn.id || `${fn.className}.${fn.methodName}`} style={{ padding: `${SPACING.xs} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                        <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: COLORS.text.primary }}>{fn.functionName}</p>
                        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px', wordBreak: 'break-word' }}>{fn.className}.{fn.methodName}({(fn.parameterTypes || []).join(', ')}) : {fn.returnType}</p>
                        {fn.description && <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: '2px' }}>{fn.description}</p>}
                    </div>
                ))}
            </div>}
            <div style={{ ...FRBC, borderTop: `1px solid ${COLORS.border.light}`, paddingTop: SPACING.sm, color: COLORS.text.tertiary, fontSize: FONT.size.xs }}><span>{formatBytes(udf.sizeBytes)}</span><span>{udf.updatedAt ? new Date(udf.updatedAt).toLocaleDateString() : 'Not published'}</span></div>
        </div>
    );
};

const UdfLibrary = () => {
    const [udfs, setUdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUpload, setShowUpload] = useState(false);

    useEffect(() => {
        udfApi.getAll().then(response => setUdfs(response.data || [])).catch(setError).finally(() => setLoading(false));
    }, []);

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
                ) : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SPACING.md }}>{udfs.map(udf => <UdfCard key={udf.id} udf={udf} />)}</div>}
                {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={udf => setUdfs(prev => [udf, ...prev])} />}
            </div>
        </ApiGuard>
    );
};

export default UdfLibrary;