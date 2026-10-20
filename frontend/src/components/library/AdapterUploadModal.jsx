import React, { useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { adapterApi } from '../../services/adapterApi';
import { useNotification } from '../../contexts/NotificationContext';

export const AdapterUploadModal = ({ onClose, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const notification = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const res = await adapterApi.upload(file, { name, description });
      onUploaded(res.data);
      onClose();
    } catch (err) {
      notification.error(err.message || 'Failed to upload adapter');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div id="adapter-upload-backdrop" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div id="adapter-upload-modal-box" className="bg-white rounded-xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 space-y-4">
        <div id="adapter-upload-header" className="flex items-center justify-between border-b border-surface-200 pb-3">
          <h3 id="adapter-upload-title" className="font-semibold text-sm text-content-primary">Install Custom Connector Adapter</h3>
          <button id="adapter-upload-close-btn" type="button" onClick={onClose} className="text-content-tertiary hover:text-content-primary">
            <X id="adapter-upload-close-icon" className="w-4 h-4" />
          </button>
        </div>

        <form id="adapter-upload-form" onSubmit={handleSubmit} className="space-y-4">
          <label id="adapter-dropzone-label" className="border-2 border-dashed border-surface-300 rounded-xl p-6 text-center bg-surface-50 hover:bg-surface-100/50 transition-colors cursor-pointer block">
            <UploadCloud id="adapter-upload-cloud-icon" className="w-9 h-9 text-brand-600 mx-auto mb-2" />
            <span id="adapter-dropzone-main" className="font-medium text-content-primary text-xs block">
              {file ? file.name : 'Click to select compiled .JAR binary'}
            </span>
            <span id="adapter-dropzone-sub" className="text-[11px] text-content-tertiary mt-1 block">
              Must implement DataShifter DataReader or DataWriter SPI interface
            </span>
            <input id="adapter-file-input" type="file" accept=".jar" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
          </label>

          <div id="adapter-upload-field-name">
            <label id="adapter-label-name" className="block text-[11px] font-semibold text-content-secondary uppercase mb-1">Adapter Name</label>
            <input id="adapter-input-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PostgreSQL Database Reader" className="w-full px-3 py-1.5 text-xs border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none" />
          </div>

          <div id="adapter-upload-field-desc">
            <label id="adapter-label-desc" className="block text-[11px] font-semibold text-content-secondary uppercase mb-1">Description</label>
            <input id="adapter-input-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Adapter description & capabilities" className="w-full px-3 py-1.5 text-xs border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none" />
          </div>

          <div id="adapter-upload-footer" className="flex items-center justify-end gap-2 pt-2 border-t border-surface-100">
            <button id="adapter-cancel-btn" type="button" onClick={onClose} className="px-3.5 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-100 rounded-lg">Cancel</button>
            <button id="adapter-submit-btn" type="submit" disabled={!file || uploading} className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-hover disabled:opacity-50 rounded-lg shadow-sm">
              {uploading ? 'Validating...' : 'Validate & Install'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdapterUploadModal;
