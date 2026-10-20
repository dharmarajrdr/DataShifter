import React, { useRef, useState } from 'react';
import { X, FileCode2, ShieldCheck } from 'lucide-react';
import { udfApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const UdfUploadModal = ({ onClose, onUploaded }) => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const notification = useNotification();

  const chooseFile = (selected) => {
    const next = selected?.[0];
    if (!next) return;
    if (!next.name.toLowerCase().endsWith('.jar')) {
      notification.error('Only Java .jar files are accepted.');
      return;
    }
    setFile(next);
    setName(next.name.replace(/\.jar$/i, ''));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return notification.error('Enter a name for this UDF.');
    if (!file) return notification.error('Choose a Java .jar file to upload.');
    setUploading(true);
    try {
      const response = await udfApi.upload(file, { name: name.trim(), description: description.trim() });
      onUploaded(response.data);
      onClose();
    } catch (err) {
      notification.error(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div id="udf-upload-backdrop" role="presentation" onClick={onClose} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div id="udf-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="udf-upload-title" onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-elevated border border-surface-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div id="udf-upload-modal-header" className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
          <div>
            <h2 id="udf-upload-title" className="text-base font-semibold text-content-primary">Upload Java UDF (.jar)</h2>
            <p id="udf-upload-subtitle" className="text-xs text-content-secondary mt-0.5">Register a compiled Java archive for bytecode introspection</p>
          </div>
          <button id="udf-upload-close-btn" type="button" aria-label="Close dialog" onClick={onClose} className="text-content-tertiary hover:text-content-primary p-1 rounded-lg hover:bg-surface-100">
            <X id="udf-upload-close-icon" className="w-5 h-5" />
          </button>
        </div>

        <div id="udf-upload-body" className="p-6 flex flex-col gap-4">
          <div>
            <label id="udf-upload-label-name" className="block text-xs font-medium text-content-secondary mb-1">UDF Identifier <span className="text-status-danger">*</span></label>
            <input id="udf-upload-input-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. security-masking" className="w-full px-3 py-2 text-xs bg-surface-50 border border-surface-300 rounded-lg text-content-primary focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none" />
          </div>
          <div>
            <label id="udf-upload-label-desc" className="block text-xs font-medium text-content-secondary mb-1">Description</label>
            <textarea id="udf-upload-input-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What business logic does this JAR implement?" className="w-full px-3 py-2 text-xs bg-surface-50 border border-surface-300 rounded-lg text-content-primary focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-none" />
          </div>
          <input ref={inputRef} id="udf-upload-file-hidden" type="file" accept=".jar,application/java-archive" onClick={(e) => { e.target.value = null; }} onChange={(e) => chooseFile(e.target.files)} className="hidden" />
          <div id="udf-upload-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files); }} className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${file ? 'border-status-success bg-emerald-50/50' : 'border-surface-300 hover:border-brand-400 bg-surface-50 hover:bg-brand-50/30'}`}>
            <FileCode2 id="udf-upload-drop-icon" className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-status-success' : 'text-content-tertiary'}`} />
            <p id="udf-upload-drop-text" className="text-xs font-semibold text-content-primary">{file ? file.name : 'Choose or drop a Java .jar binary'}</p>
            <p id="udf-upload-drop-sub" className="text-[11px] text-content-secondary mt-0.5">{file ? formatBytes(file.size) : 'Compiled JAR archives only (Max 50MB)'}</p>
          </div>
        </div>

        <div id="udf-upload-footer" className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex items-center justify-end gap-3">
          <button id="udf-upload-cancel-btn" type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-content-secondary hover:text-content-primary bg-white border border-surface-300 rounded-lg shadow-subtle hover:bg-surface-50 transition-colors">Cancel</button>
          <button id="udf-upload-submit-btn" type="button" onClick={handleSubmit} disabled={uploading} className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-hover rounded-lg shadow-subtle transition-colors disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload & Introspect'}</button>
        </div>
      </div>
    </div>
  );
};

export default UdfUploadModal;
