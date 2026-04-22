import React, { useState, useEffect } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { FRSC, FRBC } from '../constants/layouts';
import { PageHeader, Button } from '../components/common';
import { authApi } from '../services/authApi';
import { useAuth } from '../contexts/AuthContext';

const Field = ({ label, value, editable, onChange, type = 'text', hint }) => (
  <div style={{ marginBottom: SPACING.md }}>
    <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>{label}</label>
    {editable ? (
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box' }} />
    ) : (
      <p style={{ fontSize: FONT.size.md, fontWeight: FONT.weight.medium, color: COLORS.text.primary }}>{value || '—'}</p>
    )}
    {hint && <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginTop: '2px' }}>{hint}</p>}
  </div>
);

const UserProfile = () => {
  const { updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Password
  const [showPwChange, setShowPwChange] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    authApi.me().then(res => {
      const u = res.data;
      // Auto-detect timezone if not set
      if (!u.timezone) {
        try { u.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }
      }
      setUser(u);
    }).catch(() => {});
  }, []);

  const update = (key, val) => { setUser(prev => ({ ...prev, [key]: val })); setHasChanges(true); };

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await authApi.updateProfile({ fullName: user.fullName, timezone: user.timezone });
      setUser(res.data);
      setHasChanges(false);
      setSaveMsg('Profile saved');
      updateUser(res.data);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg('Save failed: ' + (e?.response?.data?.message || e.message || 'Unknown error'));
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!currentPw || !newPw) { setPwMsg('All fields required'); return; }
    if (newPw !== confirmPw) { setPwMsg('New passwords do not match'); return; }
    if (newPw.length < 6) { setPwMsg('Password must be at least 6 characters'); return; }
    setPwSaving(true);
    try {
      await authApi.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg('Password changed successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setPwMsg(null); setShowPwChange(false); }, 2000);
    } catch (e) {
      setPwMsg(e?.response?.data?.message || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  if (!user) return null;

  // Detect browser timezone for display
  let detectedTz = '';
  try { detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account and preferences"
        actions={hasChanges ? (
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            {saveMsg && <span style={{ fontSize: FONT.size.xs, color: saveMsg.includes('failed') ? '#A32D2D' : '#0F6E56' }}>{saveMsg}</span>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
          </div>
        ) : saveMsg ? <span style={{ fontSize: FONT.size.xs, color: '#0F6E56' }}>{saveMsg}</span> : null}
      />

      <div style={{ maxWidth: '580px' }}>
        {/* Avatar + name header */}
        <div style={{
          ...FRSC, gap: SPACING.md, marginBottom: SPACING.xl,
          padding: SPACING.lg, background: COLORS.background.primary,
          border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.lg,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: user.avatarColor || COLORS.brand.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: FONT.size.xl, fontWeight: FONT.weight.medium, color: '#fff', flexShrink: 0,
          }}>
            {user.displayInitials || '?'}
          </div>
          <div>
            <p style={{ fontSize: FONT.size.xl, fontWeight: FONT.weight.medium }}>{user.fullName}</p>
            <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '2px' }}>
              {user.roleName || 'Member'} at {user.orgName || 'No organization'}
            </p>
          </div>
        </div>

        {/* Account info */}
        <div style={{
          padding: SPACING.lg, background: COLORS.background.primary,
          border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.lg,
          marginBottom: SPACING.lg,
        }}>
          <p style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.medium, marginBottom: SPACING.md }}>Account information</p>
          <Field label="Full name" value={user.fullName} editable onChange={v => update('fullName', v)} />
          <Field label="Email" value={user.email} hint="Email cannot be changed" />
          <Field label="Role" value={user.roleName || '—'} />
          <Field label="Organization" value={user.orgName || '—'} />
          <Field label="Timezone" value={user.timezone || ''} editable onChange={v => update('timezone', v)}
            hint={user.timezone === detectedTz ? `Detected from your browser` : `Browser detected: ${detectedTz}`} />
          <Field label="Member since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
        </div>

        {/* Security */}
        <div style={{
          padding: SPACING.lg, background: COLORS.background.primary,
          border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.lg,
        }}>
          <p style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.medium, marginBottom: SPACING.md }}>Security</p>
          <div style={{ ...FRBC, marginBottom: SPACING.sm }}>
            <div>
              <p style={{ fontSize: FONT.size.md }}>Password</p>
              <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '2px' }}>Change your account password</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowPwChange(!showPwChange)}>
              {showPwChange ? 'Cancel' : 'Change password'}
            </Button>
          </div>
          {showPwChange && (
            <div style={{ padding: SPACING.md, background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.sm }}>
              <Field label="Current password" value={currentPw} editable onChange={setCurrentPw} type="password" />
              <Field label="New password" value={newPw} editable onChange={setNewPw} type="password" />
              <Field label="Confirm new password" value={confirmPw} editable onChange={setConfirmPw} type="password" />
              {pwMsg && <p style={{ fontSize: FONT.size.xs, color: pwMsg.includes('success') ? '#0F6E56' : '#A32D2D', marginBottom: SPACING.xs }}>{pwMsg}</p>}
              <Button onClick={handleChangePassword} disabled={pwSaving}>{pwSaving ? 'Changing...' : 'Update password'}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;