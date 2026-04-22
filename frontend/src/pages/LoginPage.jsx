import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common';

const inputStyle = {
  width: '100%', padding: '10px 12px', border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box',
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/pipelines';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px', color: COLORS.text.primary }}>
        Welcome back
      </h2>
      <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, margin: '0 0 24px' }}>
        Sign in to your Datashifter account
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: SPACING.md }}>
          <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle} placeholder="you@company.com" required autoFocus />
        </div>

        <div style={{ marginBottom: SPACING.md }}>
          <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            style={inputStyle} placeholder="Enter your password" required />
        </div>

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
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p style={{ textAlign: 'center', fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '20px' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: COLORS.brand.primary, textDecoration: 'none', fontWeight: 500 }}>
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;