import { useEffect, useState } from 'react';
import { ApiGuard, BarLoader, Button, Chip, Loader } from '../components/common';
import SettingsTabs from '../components/common/SettingsTabs';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../constants/design';
import { FRBC, FRSC } from '../constants/layouts';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { authApi } from '../services/authApi';

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md,
  fontSize: FONT.size.sm,
  boxSizing: 'border-box',
  background: '#fff',
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

const readOnlyInputStyle = {
  ...inputStyle,
  background: COLORS.background.secondary,
  color: COLORS.text.secondary,
  cursor: 'default',
};

const SectionTitle = ({ title, subtitle, action }) => (
  <div style={{ ...FRBC, marginBottom: SPACING.md }}>
    <div>
      <p style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.medium, margin: 0 }}>{title}</p>
      {subtitle && <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '2px', marginBottom: 0 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const OrgSettingsPage = () => {
  const { user, updateUser, refreshOrganizations, hasPermission } = useAuth();
  const [org, setOrg] = useState(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEditOrg = hasPermission('org:manage_roles') || hasPermission('org:manage_members') || !!user?.orgOwner;

  // Load organization details from backend
  useEffect(() => {
    let mounted = true;
    const fetchOrg = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authApi.getOrg();
        const data = res.data || {};
        if (mounted) {
          setOrg(data);
          setName(data.name || user?.orgName || '');
          setLogoUrl(data.logoUrl || '');
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          // Fallback to user org info if getOrg is not supported yet
          setName(user?.orgName || '');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOrg();
    return () => {
      mounted = false;
    };
  }, [user?.orgName]);

  const isChanged = org && (name.trim() !== (org.name || '') || (logoUrl.trim() || '') !== (org.logoUrl || ''));

  const handleCopyOrgId = () => {
    const orgId = org?.id || user?.orgId;
    if (orgId && navigator.clipboard) {
      navigator.clipboard.writeText(orgId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancel = () => {
    if (org) {
      setName(org.name || '');
      setLogoUrl(org.logoUrl || '');
      setError(null);
      setSaveSuccess(false);
    }
  };

  const notification = useNotification();

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim() || !canEditOrg || saving) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        name: name.trim(),
        logoUrl: logoUrl.trim() || null,
      };
      const res = await authApi.updateOrg(payload);
      const updated = res.data || { ...org, ...payload };
      setOrg(updated);
      setName(updated.name);
      setLogoUrl(updated.logoUrl || '');
      setSaveSuccess(true);
      notification.success('Organization details updated successfully');

      // Sync changes across context and sidebar
      if (updateUser) {
        updateUser({ orgName: updated.name });
      }
      if (refreshOrganizations) {
        refreshOrganizations();
      }

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update organization details');
      notification.error(err.message || 'Failed to update organization details');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = org?.createdAt
    ? new Date(org.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : null;

  return (
    <ApiGuard
      error={error}
      loading={loading}
      loadingComponent={
        <div>
          <BarLoader />
          <div style={{ maxWidth: '680px', paddingTop: SPACING.xl }}>
            <Loader message="Loading organization settings..." />
          </div>
        </div>
      }
    >
      <div>
        <SettingsTabs
          title="Organization settings"
          subtitle={org?.name || user?.orgName || 'Your organization'}
        />

        <div style={{ maxWidth: '680px', paddingTop: SPACING.xl }}>
          {/* Header Preview Card */}
          <div
            style={{
              padding: SPACING.lg,
              background: COLORS.background.primary,
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.lg,
              marginBottom: SPACING.xl,
            }}
          >
            <div style={{ ...FRBC }}>
              <div style={{ ...FRSC, gap: SPACING.md }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: BORDER_RADIUS.md,
                    background: COLORS.brand.primaryLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 600,
                    color: COLORS.brand.primary,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {logoUrl.trim() ? (
                    <img
                      src={logoUrl.trim()}
                      alt={name || 'Org'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    (name || user?.orgName || 'O').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, margin: 0 }}>
                    {name || user?.orgName || 'Organization'}
                  </h2>
                  <div style={{ ...FRSC, gap: SPACING.xs, marginTop: '4px', flexWrap: 'wrap' }}>
                    {org?.slug && <Chip label={`slug: ${org.slug}`} colorScheme="purple" />}
                    {org?.memberCount !== undefined && (
                      <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                        {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {formattedDate && (
                      <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                        · Created {formattedDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form Section */}
          <SectionTitle
            title="Organization details"
            subtitle="Update your organization profile and public workspace settings"
          />


          <form
            onSubmit={handleSave}
            style={{
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.lg,
              padding: SPACING.lg,
              background: COLORS.background.primary,
              display: 'flex',
              flexDirection: 'column',
              gap: SPACING.md,
            }}
          >
            {/* Organization Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: FONT.size.sm,
                  fontWeight: FONT.weight.medium,
                  marginBottom: '4px',
                }}
              >
                Name <span style={{ color: COLORS.status.errorDark }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEditOrg || saving}
                placeholder="e.g. Acme Corp"
                style={canEditOrg ? inputStyle : readOnlyInputStyle}
                required
              />
            </div>

            {/* Organization Slug */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: FONT.size.sm,
                  fontWeight: FONT.weight.medium,
                  marginBottom: '4px',
                }}
              >
                Slug
              </label>
              <input
                type="text"
                value={org?.slug || ''}
                readOnly
                disabled
                style={readOnlyInputStyle}
              />
            </div>

            {/* Organization ID */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: FONT.size.sm,
                  fontWeight: FONT.weight.medium,
                  marginBottom: '4px',
                }}
              >
                ID
              </label>
              <div style={{ ...FRSC, gap: SPACING.xs }}>
                <input
                  type="text"
                  value={org?.id || user?.orgId || ''}
                  readOnly
                  disabled
                  style={{
                    ...readOnlyInputStyle,
                    fontFamily: 'monospace',
                    fontSize: FONT.size.xs,
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyOrgId}
                  style={{ minWidth: '70px' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: FONT.size.sm,
                  fontWeight: FONT.weight.medium,
                  marginBottom: '4px',
                }}
              >
                Logo URL (optional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={!canEditOrg || saving}
                placeholder="https://example.com/logo.png"
                style={canEditOrg ? inputStyle : readOnlyInputStyle}
              />
            </div>

            {/* Action Buttons */}
            {canEditOrg && (
              <div
                style={{
                  ...FRSC,
                  justifyContent: 'flex-end',
                  gap: SPACING.sm,
                  paddingTop: SPACING.sm,
                  borderTop: `1px solid ${COLORS.border.light}`,
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!isChanged || saving}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isChanged || !name.trim() || saving}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </ApiGuard>
  );
};

export default OrgSettingsPage;