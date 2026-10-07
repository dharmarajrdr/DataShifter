import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { Button } from '../components/common';
import AuthLayout from '../components/auth/AuthLayout';

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
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px', color: '#111827' }}>Invalid Link</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>No reset token provided.</p>
        <div className="text-center">
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm font-medium">
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
      <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px', color: '#111827' }}>Reset Password</h2>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>Choose a new password for your account.</p>
      {success ? (
        <div className="text-center">
          <div className="mb-4 text-green-600 bg-green-50 p-3 rounded text-sm">
            Password has been successfully reset!
          </div>
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
            Reset Password
          </Button>
        </form>
      )}
    </div>
  );
}
