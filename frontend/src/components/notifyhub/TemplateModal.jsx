import React, { useState, useEffect } from 'react';
import { Button } from '../common';
import { CloseIcon } from '../layout/Icons';
import { notifyHubApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import TemplatePreviewSection from './TemplatePreviewSection';

export const TemplateModal = ({ template, onClose, onSave }) => {
  const notification = useNotification();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [subjectTemplate, setSubjectTemplate] = useState(template?.subjectTemplate || '[ALERT] Pipeline {{pipeline_name}} status: {{priority}}');
  const [bodyTemplate, setBodyTemplate] = useState(
    template?.bodyTemplate || 'Pipeline {{pipeline_name}} (ID: {{pipeline_id}}) encountered an issue at {{timestamp}}.\n\nError Message:\n{{error_message}}\n\nPriority: {{priority}}'
  );
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      notifyHubApi.previewTemplate({ name: name || 'Preview Template', subjectTemplate, bodyTemplate })
        .then((res) => { const data = res?.data || res; if (data) setPreview(data); })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [name, subjectTemplate, bodyTemplate]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return notification.error('Template name is required.');
    if (!bodyTemplate.trim()) return notification.error('Body template is required.');

    setSaving(true);
    try {
      const payload = {
        name: name.trim(), description: description.trim() || undefined,
        subjectTemplate: subjectTemplate.trim() || undefined, bodyTemplate: bodyTemplate.trim(),
      };
      if (isEdit) await notifyHubApi.updateTemplate(template.id, payload);
      else await notifyHubApi.createTemplate(payload);
      notification.success(`Template "${name}" ${isEdit ? 'updated' : 'created'} successfully`);
      onSave();
    } catch (err) { notification.error(err.message || 'Failed to save template'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Notification Template' : 'Create Notification Template'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"><CloseIcon /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name <span className="text-rose-600">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Critical Failure Slack Digest" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Template</label>
            <input type="text" value={subjectTemplate} onChange={(e) => setSubjectTemplate(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 font-mono text-[11px]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Body Template <span className="text-rose-600">*</span></label>
            <textarea rows={4} value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 font-mono text-[11px] leading-relaxed resize-y" />
            <p className="text-[10px] text-slate-400 mt-1">Available tags: {'{{pipeline_name}}, {{error_message}}, {{priority}}, {{timestamp}}, {{action_url}}'}</p>
          </div>

          <TemplatePreviewSection preview={preview} />
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : (isEdit ? 'Update Template' : 'Create Template')}</Button>
        </div>
      </form>
    </div>
  );
};

export default TemplateModal;
