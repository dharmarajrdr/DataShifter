import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { Button } from '../components/common';
import AuthLayout from '../components/auth/AuthLayout';

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
      <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px', color: '#111827' }}>Forgot Password</h2>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>Enter your email to receive a password reset link.</p>
      
      {success ? (
        <div className="text-center">
          <div className="mb-4 text-green-600 bg-green-50 p-3 rounded text-sm">
            If an account exists for that email, we have sent a password reset link.
          </div>
          <Link to="/login" className="text-blue-600 hover:underline text-sm font-medium">
            Return to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="you@company.com"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
            Send Reset Link
          </Button>

          <div className="text-center text-sm mt-4">
            <Link to="/login" className="text-blue-600 hover:text-blue-500">
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
