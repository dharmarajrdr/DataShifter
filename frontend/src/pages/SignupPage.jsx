import React, { useState } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common';

const inputStyle = {
  width: '100%', padding: '10px 12px', border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box',
};

const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [step, setStep] = useState(inviteToken ? 'form' : 'choose'); // 'choose' | 'form'
  const [path, setPath] = useState(inviteToken ? 'invite' : null);    // 'create_org' | 'invite' | 'skip'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState(null);
  const { signup, loading } = useAuth();
  const navigate = useNavigate();

  const handleChoose = (chosen) => {
    setPath(chosen);
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (path === 'create_org' && !orgName.trim()) { setError('Organization name is required'); return; }

    try {
      await signup({
        fullName, email, password,
        orgName: path === 'create_org' ? orgName : null,
        inviteToken: path === 'invite' ? inviteToken : null,
      });
      navigate(path === 'skip' ? '/onboard' : '/pipelines', { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed');
    }
  };

  // Step 1: Choose path
  if (step === 'choose') {
    return (
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px' }}>Get started</h2>
        <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, margin: '0 0 24px' }}>
          How would you like to join Datashifter?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
          <PathCard
            title="Create a new organization"
            description="Set up your team workspace and invite members"
            onClick={() => handleChoose('create_org')}
            icon="+"
          />
          <PathCard
            title="Join with an invite link"
            description="I have an invitation from my team"
            onClick={() => handleChoose('invite')}
            icon="→"
          />
          <PathCard
            title="Sign up and join later"
            description="Create your account now, join an org later"
            onClick={() => handleChoose('skip')}
            icon="○"
            subtle
          />
        </div>

        <p style={{ textAlign: 'center', fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '20px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: COLORS.brand.primary, textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Step 2: Registration form
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px' }}>
        {path === 'create_org' ? 'Create your organization' : path === 'invite' ? 'Join your team' : 'Create your account'}
      </h2>
      <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, margin: '0 0 24px' }}>
        {path === 'create_org' ? "You'll be the first admin" : path === 'invite' ? 'Complete your profile to join' : 'You can join an organization later'}
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: SPACING.md }}>
          <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            style={inputStyle} placeholder="Jane Doe" required autoFocus />
        </div>

        <div style={{ marginBottom: SPACING.md }}>
          <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle} placeholder="you@company.com" required />
        </div>

        <div style={{ marginBottom: SPACING.md }}>
          <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            style={inputStyle} placeholder="At least 8 characters" required />
        </div>

        {path === 'create_org' && (
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Organization name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)}
              style={inputStyle} placeholder="e.g., Acme Corp" required />
          </div>
        )}

        {path === 'invite' && !inviteToken && (
          <div style={{
            background: COLORS.status.warningLight, padding: '10px 12px',
            borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, color: COLORS.status.warningText,
            marginBottom: SPACING.md,
          }}>
            No invite token found. Ask your team admin to send you an invite link, or use the direct URL: /signup?invite=TOKEN
          </div>
        )}

        {error && (
          <div style={{
            background: COLORS.status.errorLight, color: COLORS.status.errorText,
            padding: '8px 12px', borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs,
            marginBottom: SPACING.md,
          }}>
            {error}
          </div>
        )}

        <Button type="submit" style={{ width: '100%', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Creating account...' : (path === 'create_org' ? 'Create org & sign up' : 'Sign up')}
        </Button>

        {step === 'form' && !inviteToken && (
          <button type="button" onClick={() => { setStep('choose'); setPath(null); setError(null); }}
            style={{
              display: 'block', width: '100%', marginTop: SPACING.sm, padding: '8px',
              background: 'none', border: 'none', color: COLORS.text.secondary,
              fontSize: FONT.size.sm, cursor: 'pointer', textAlign: 'center',
            }}>
            ← Back to options
          </button>
        )}
      </form>

      <p style={{ textAlign: 'center', fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '16px' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: COLORS.brand.primary, textDecoration: 'none', fontWeight: 500 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
};

const PathCard = ({ title, description, onClick, icon, subtle }) => (
  <div
    onClick={onClick}
    style={{
      padding: '16px', borderRadius: BORDER_RADIUS.md, cursor: 'pointer',
      border: `1px solid ${COLORS.border.light}`,
      background: COLORS.background.primary,
      display: 'flex', alignItems: 'center', gap: '12px',
      transition: 'all 0.15s',
      opacity: subtle ? 0.7 : 1,
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.brand.primary; e.currentTarget.style.background = COLORS.brand.primaryLight; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border.light; e.currentTarget.style.background = COLORS.background.primary; }}
  >
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: subtle ? COLORS.background.secondary : COLORS.brand.primaryLight,
      color: subtle ? COLORS.text.secondary : COLORS.brand.primary,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px', fontWeight: 500,
    }}>{icon}</div>
    <div>
      <p style={{ fontSize: FONT.size.md, fontWeight: 500, margin: '0 0 2px', color: COLORS.text.primary }}>{title}</p>
      <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, margin: 0 }}>{description}</p>
    </div>
  </div>
);

export default SignupPage;