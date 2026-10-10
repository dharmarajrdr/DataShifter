import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common';
import { authApi } from '../services/authApi';

const inputStyle = {
  width: '100%', padding: '10px 12px', border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box',
};

const OnboardPage = () => {
  const [mode, setMode] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [pendingRequest, setPendingRequest] = useState(null);
  const { user, token, logout, refreshToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await authApi.getMyInvitations();
        const invites = res.data || [];
        setPendingInvites(invites.filter(i => i.inviteType === 'INVITE' && i.status === 'PENDING'));
        setPendingRequest(invites.find(i => i.inviteType === 'REQUEST' && i.status === 'PENDING') || null);
      } catch { /* ignore */ }
    })();
  }, [token]);

  const handleAcceptInvite = async (inviteId) => {
    setLoading(true); setError(null);
    try {
      await authApi.handleInvitation(inviteId, 'ACCEPT');
      setSuccess('Invitation accepted! Redirecting...');
      setTimeout(async () => {
        try { await refreshToken(); navigate('/pipelines', { replace: true }); }
        catch { navigate('/login', { replace: true }); }
      }, 1000);
    } catch (err) { setError(err.message || 'Failed to accept'); }
    finally { setLoading(false); }
  };

  const handleDeclineInvite = async (inviteId) => {
    try { await authApi.handleInvitation(inviteId, 'REJECT'); setPendingInvites(p => p.filter(i => i.id !== inviteId)); }
    catch (err) { setError(err.message || 'Failed to decline'); }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) { setError('Organization name is required'); return; }
    setLoading(true); setError(null);
    try { await authApi.createOrg({ name: orgName }); navigate('/login', { replace: true }); }
    catch (err) { setError(err.message || 'Failed to create organization'); }
    finally { setLoading(false); }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!orgSlug.trim()) { setError('Organization slug is required'); return; }
    setLoading(true); setError(null);
    try {
      const res = await authApi.requestAccess({ orgSlug });
      setPendingRequest(res.data);
      setSuccess('Access request sent! An admin will review your request.');
      setMode(null);
    } catch (err) { setError(err.message || 'Failed to send request'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px' }}>Join an organization</h2>
      <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, margin: '0 0 24px' }}>
        Hi {user?.fullName || 'there'}! You need to be part of an organization to use Datashifter.
      </p>

      {success && (
        <div style={{ background: COLORS.status.successLight, color: COLORS.status.successText, padding: '16px', borderRadius: BORDER_RADIUS.md, textAlign: 'center', marginBottom: SPACING.md }}>
          <p style={{ fontSize: FONT.size.md, fontWeight: 500, marginBottom: '4px' }}>{success}</p>
        </div>
      )}

      {!success && pendingInvites.length > 0 && (
        <div style={{ marginBottom: SPACING.lg }}>
          <p style={{ fontSize: FONT.size.sm, fontWeight: 500, marginBottom: SPACING.xs }}>
            You have pending invitation{pendingInvites.length > 1 ? 's' : ''}
          </p>
          {pendingInvites.map(inv => (
            <div key={inv.id} style={{ padding: '14px', borderRadius: BORDER_RADIUS.md, border: `2px solid ${COLORS.brand.primary}`, background: COLORS.accent.purpleLight, marginBottom: SPACING.xs }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: FONT.size.md, fontWeight: 500, margin: '0 0 2px' }}>{inv.orgName}</p>
                  <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>
                    <b>{inv.invitedByName}</b> invited you.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: SPACING.xs }}>
                  <Button variant="secondary" size="sm" onClick={() => handleDeclineInvite(inv.id)}>Decline</Button>
                  <Button size="sm" onClick={() => handleAcceptInvite(inv.id)} style={loading ? { opacity: 0.6 } : {}}>
                    {loading ? 'Accepting...' : 'Accept'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!success && pendingRequest && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', padding: '14px', borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md }}>
          <p style={{ fontSize: FONT.size.sm, fontWeight: 500, color: '#854F0B', margin: '0 0 4px' }}>Access request pending</p>
          <p style={{ fontSize: FONT.size.xs, color: '#854F0B', margin: 0 }}>Waiting for admin approval. You'll be notified once approved.</p>
        </div>
      )}

      {!success && (
        <>
          {!mode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
              <div onClick={() => setMode('create')} style={{ padding: '16px', borderRadius: BORDER_RADIUS.md, cursor: 'pointer', border: `1px solid ${COLORS.border.light}`, background: COLORS.background.primary, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.brand.primary} onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border.light}>
                <p style={{ fontSize: FONT.size.md, fontWeight: 500, margin: '0 0 2px' }}>Create a new organization</p>
                <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>Set up a workspace for your team</p>
              </div>
              {!pendingRequest && (
                <div onClick={() => setMode('request')} style={{ padding: '16px', borderRadius: BORDER_RADIUS.md, cursor: 'pointer', border: `1px solid ${COLORS.border.light}`, background: COLORS.background.primary, transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.brand.primary} onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border.light}>
                  <p style={{ fontSize: FONT.size.md, fontWeight: 500, margin: '0 0 2px' }}>Request access to an existing org</p>
                  <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>Ask an admin to add you</p>
                </div>
              )}
            </div>
          ) : mode === 'create' ? (
            <form onSubmit={handleCreateOrg}>
              <div style={{ marginBottom: SPACING.md }}>
                <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Organization name</label>
                <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} placeholder="e.g., Acme Corp" required autoFocus />
              </div>
              {error && <div style={{ background: COLORS.status.errorLight, color: COLORS.status.errorText, padding: '8px 12px', borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, marginBottom: SPACING.md }}>{error}</div>}
              <div style={{ display: 'flex', gap: SPACING.xs }}>
                <Button variant="secondary" onClick={() => { setMode(null); setError(null); }}>Back</Button>
                <Button type="submit" style={{ flex: 1, opacity: loading ? 0.6 : 1 }}>{loading ? 'Creating...' : 'Create organization'}</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestAccess}>
              <div style={{ marginBottom: SPACING.md }}>
                <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Organization slug</label>
                <input value={orgSlug} onChange={e => setOrgSlug(e.target.value)} style={inputStyle} placeholder="e.g., acme-corp" required autoFocus />
                <p style={{ fontSize: '11px', color: COLORS.text.tertiary, marginTop: '4px' }}>Ask your team admin for the organization slug</p>
              </div>
              {error && <div style={{ background: COLORS.status.errorLight, color: COLORS.status.errorText, padding: '8px 12px', borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, marginBottom: SPACING.md }}>{error}</div>}
              <div style={{ display: 'flex', gap: SPACING.xs }}>
                <Button variant="secondary" onClick={() => { setMode(null); setError(null); }}>Back</Button>
                <Button type="submit" style={{ flex: 1, opacity: loading ? 0.6 : 1 }}>{loading ? 'Sending...' : 'Request access'}</Button>
              </div>
            </form>
          )}
        </>
      )}

      <button onClick={logout} style={{ display: 'block', width: '100%', marginTop: '20px', padding: '8px', background: 'none', border: 'none', color: COLORS.text.tertiary, fontSize: FONT.size.xs, cursor: 'pointer', textAlign: 'center' }}>Sign out</button>
    </div>
  );
};

export default OnboardPage;