import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { Button } from '../components/common';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';

const inputStyle = {
  width: '100%', padding: '10px 12px', border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box',
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px', color: COLORS.text.primary }}>
          Invalid Link
        </h2>
        <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, margin: '0 0 24px' }}>
          No reset token provided.
        </p>
        <div style={{ textAlign: 'center' }}>
          <Link to="/forgot-password" style={{ color: COLORS.brand.primary, textDecoration: 'none', fontSize: FONT.size.sm, fontWeight: 500 }}>
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px', color: COLORS.text.primary }}>
        Reset Password
      </h2>
      <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, margin: '0 0 24px' }}>
        Choose a new password for your account.
      </p>
      
      {success ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: COLORS.status.successLight, color: COLORS.status.successText,
            padding: '8px 12px', borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.sm,
            marginBottom: SPACING.md,
          }}>
            Password has been successfully reset!
          </div>
          <Button onClick={() => navigate('/login')} style={{ width: '100%' }}>
            Go to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: COLORS.status.errorLight, color: COLORS.status.errorText,
              padding: '8px 12px', borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs,
              marginBottom: SPACING.md,
            }}>
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
              New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="Min 8 characters"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: '4px' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              placeholder="Confirm password"
            />
          </div>

          <Button type="submit" style={{ width: '100%', opacity: loading ? 0.6 : 1 }} isLoading={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      )}
    </div>
  );
}
