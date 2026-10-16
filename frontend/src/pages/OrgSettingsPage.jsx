import React, { useEffect, useState } from 'react';
import { ApiGuard, BarLoader, Loader } from '../components/common';
import SettingsTabs from '../components/common/SettingsTabs';
import { OrgPreviewCard, OrgDetailsForm, OrgSecurityGovernanceCard, OrgQuotasUsageCard } from '../components/settings';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { authApi } from '../services/authApi';

const OrgSettingsPage = () => {
  const { user, updateUser, refreshOrganizations, hasPermission } = useAuth();
  const [org, setOrg] = useState(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const notification = useNotification();

  const canEditOrg = hasPermission('org:manage_roles') || hasPermission('org:manage_members') || !!user?.orgOwner;

  useEffect(() => {
    let mounted = true;
    const fetchOrg = async () => {
      setLoading(true);
      try {
        const res = await authApi.getOrg();
        const data = res.data || {};
        if (mounted) {
          setOrg(data);
          setName(data.name || user?.orgName || '');
          setLogoUrl(data.logoUrl || '');
        }
      } catch (err) {
        if (mounted) { setError(err); setName(user?.orgName || ''); }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOrg();
    return () => { mounted = false; };
  }, [user?.orgName]);

  const isChanged = org && (name.trim() !== (org.name || '') || (logoUrl.trim() || '') !== (org.logoUrl || ''));

  const handleCancel = () => {
    if (org) { setName(org.name || ''); setLogoUrl(org.logoUrl || ''); setError(null); }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim() || !canEditOrg || saving) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), logoUrl: logoUrl.trim() || null };
      const res = await authApi.updateOrg(payload);
      const updated = res.data || { ...org, ...payload };
      setOrg(updated);
      setName(updated.name);
      setLogoUrl(updated.logoUrl || '');
      notification.success('Organization details updated successfully');
      updateUser?.({ orgName: updated.name });
      refreshOrganizations?.();
    } catch (err) {
      setError(err.message || 'Failed to update organization');
      notification.error(err.message || 'Failed to update organization');
    } finally { setSaving(false); }
  };

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div><BarLoader /><div className="max-w-7xl pt-6"><Loader message="Loading settings..." /></div></div>}>
      <div id="org-settings-page" className="ds-org-settings-page max-w-7xl mx-auto pb-12">
        <SettingsTabs title="Organization settings" subtitle={org?.name || user?.orgName || 'Your organization'} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <OrgDetailsForm org={org} name={name} onNameChange={setName} logoUrl={logoUrl} onLogoUrlChange={setLogoUrl} canEditOrg={canEditOrg} saving={saving} isChanged={isChanged} onCancel={handleCancel} onSave={handleSave} />
            <OrgSecurityGovernanceCard />
          </div>
          <div className="space-y-6">
            <OrgPreviewCard name={name || user?.orgName} logoUrl={logoUrl} memberCount={org?.memberCount} createdAt={org?.createdAt} />
            <OrgQuotasUsageCard />
          </div>
        </div>
      </div>
    </ApiGuard>
  );
};

export default OrgSettingsPage;