import React, { useState } from 'react';
import { Button } from '../common';
import SettingsSectionHeader from './SettingsSectionHeader';

export const OrgDetailsForm = ({
  id = 'org-details-form',
  org,
  name,
  onNameChange,
  logoUrl,
  onLogoUrlChange,
  canEditOrg,
  saving,
  isChanged,
  onCancel,
  onSave,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyOrgId = () => {
    const orgId = org?.id;
    if (orgId && navigator.clipboard) {
      navigator.clipboard.writeText(orgId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id={id} className="ds-org-details-section">
      <SettingsSectionHeader
        id={`${id}-header`}
        title="Organization details"
        subtitle="Update your organization profile and public workspace settings"
      />

      <form onSubmit={onSave} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Name <span className="text-rose-600">*</span></label>
          <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} disabled={!canEditOrg || saving} placeholder="e.g. Acme Corp" required className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-500" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
          <input type="text" value={org?.slug || ''} readOnly disabled className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ID</label>
          <div className="flex gap-2">
            <input type="text" value={org?.id || ''} readOnly disabled className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono" />
            <Button type="button" size="sm" variant="secondary" onClick={handleCopyOrgId} style={{ minWidth: '70px' }}>{copied ? 'Copied!' : 'Copy'}</Button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL (optional)</label>
          <input type="url" value={logoUrl} onChange={(e) => onLogoUrlChange(e.target.value)} disabled={!canEditOrg || saving} placeholder="https://example.com/logo.png" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-500" />
        </div>

        {canEditOrg && (
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" disabled={!isChanged || saving} onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!isChanged || !name?.trim() || saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default OrgDetailsForm;
