import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { Button } from '../components/common';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';

const inputStyle = {
  width: '100%', padding: '10px 12px', border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box',
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px', color: COLORS.text.primary }}>
        Forgot Password
      </h2>
      <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, margin: '0 0 24px' }}>
        Enter your email to receive a password reset link.
      </p>
      
      {success ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: COLORS.status.successLight, color: COLORS.status.successText,
            padding: '8px 12px', borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.sm,
            marginBottom: SPACING.md,
          }}>
            If an account exists for that email, we have sent a password reset link.
          </div>
          <Link to="/login" style={{ color: COLORS.brand.primary, textDecoration: 'none', fontSize: FONT.size.sm, fontWeight: 500 }}>
            Return to Login
          </Link>
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
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@company.com"
              autoFocus
            />
          </div>

          <Button type="submit" style={{ width: '100%', opacity: loading ? 0.6 : 1 }} isLoading={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <p style={{ textAlign: 'center', fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '20px' }}>
            <Link to="/login" style={{ color: COLORS.brand.primary, textDecoration: 'none', fontWeight: 500 }}>
              Back to Login
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
