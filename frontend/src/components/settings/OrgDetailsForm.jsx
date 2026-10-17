import React, { useState } from 'react';
import { Button } from '../common';

export const OrgDetailsForm = ({
  id = 'org-details-form', org, name, onNameChange,
  logoUrl, onLogoUrlChange, canEditOrg, saving, isChanged, onCancel, onSave,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyOrgId = () => {
    if (org?.id && navigator.clipboard) {
      navigator.clipboard.writeText(org.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <form id={id} onSubmit={onSave} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="pb-2.5 mb-3.5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Organization Identity</h3>
        <span className="text-xs text-slate-400 font-normal">Organization details</span>
      </div>

      <div className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Organization Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={!canEditOrg || saving}
              placeholder="e.g. Acme Corp"
              required
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Organization Slug</label>
            <input
              type="text"
              value={org?.slug || ''}
              readOnly
              disabled
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Organization ID</label>
            <div className="flex gap-2">
              <input type="text" value={org?.id || ''} readOnly disabled className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono" />
              <Button type="button" size="sm" variant="secondary" onClick={handleCopyOrgId} style={{ minWidth: '65px' }}>{copied ? 'Copied!' : 'Copy'}</Button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL (optional)</label>
            <input type="url" value={logoUrl} onChange={(e) => onLogoUrlChange(e.target.value)} disabled={!canEditOrg || saving} placeholder="https://example.com/logo.png" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-500" />
          </div>
        </div>

        {canEditOrg && (
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" disabled={!isChanged || saving} onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!isChanged || !name?.trim() || saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
          </div>
        )}
      </div>
    </form>
  );
};

export default OrgDetailsForm;
