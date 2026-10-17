import React, { useState } from 'react';
import { Button, ConfirmationModal } from '../common';
import { useNotification } from '../../contexts/NotificationContext';

export const OrgSecurityGovernanceCard = ({ id = 'org-security' }) => {
  const [retention, setRetention] = useState('180');
  const [errorBuffer, setErrorBuffer] = useState('30');
  const [samlEnabled, setSamlEnabled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const notification = useNotification();

  return (
    <div className="space-y-4">
      {/* Security & Data Governance */}
      <div id={`${id}-governance`} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 pb-2.5 mb-3.5 border-b border-slate-100 flex items-center justify-between">
          <span>Security & Data Governance</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Compliance</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Log Retention</label>
            <select value={retention} onChange={(e) => { setRetention(e.target.value); notification.success('Audit log retention policy updated'); }} className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600">
              <option value="90">90 Days (Standard SaaS)</option>
              <option value="180">180 Days (SOC2 Compliant)</option>
              <option value="365">365 Days (Enterprise)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Error Sample Buffer</label>
            <select value={errorBuffer} onChange={(e) => { setErrorBuffer(e.target.value); notification.success('Error sample buffer retention updated'); }} className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600">
              <option value="30">30 Days Retention</option>
              <option value="60">60 Days Retention</option>
            </select>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800">Enforce SAML 2.0 / Okta SSO</p>
            <p className="text-[11px] text-slate-500">Require team members to authenticate through enterprise identity provider</p>
          </div>
          <input type="checkbox" checked={samlEnabled} onChange={(e) => { setSamlEnabled(e.target.checked); notification.info(`SAML SSO ${e.target.checked ? 'enabled' : 'disabled'}`); }} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" />
        </div>
      </div>

      {/* Danger Zone */}
      <div id={`${id}-danger`} className="bg-rose-50/60 border border-rose-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-rose-700 mb-1.5">Danger Zone</h3>
        <p className="text-xs text-rose-600 leading-relaxed mb-3.5">
          Deleting this organization will permanently wipe all pipelines, workflows, connector credentials, and historical logs. This action cannot be reversed.
        </p>
        <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete Organization</Button>
      </div>

      <ConfirmationModal isOpen={showDeleteConfirm} title="Delete Organization" message="Are you sure you want to delete this organization? All team resources will be permanently removed." color="#DC2626" onClose={() => setShowDeleteConfirm(false)} actions={[{ label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteConfirm(false) }, { label: 'Yes, delete', variant: 'danger', onClick: () => { setShowDeleteConfirm(false); notification.error('Please contact system administrator to delete active root organization.'); } }]} />
    </div>
  );
};

export default OrgSecurityGovernanceCard;
