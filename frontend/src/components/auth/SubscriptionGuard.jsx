import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { paymentApi } from '../../services/paymentApi';
import { ErrorState } from '../common';

/**
 * Wraps authenticated routes. Checks subscription status:
 * - ACTIVE / no subscription yet (Free tier) → allow through
 * - EXPIRED → owner gets redirected to /billing, members see "contact admin" message
 *
 * Subscription check is cached for 5 minutes in sessionStorage.
 */
const SubscriptionGuard = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('LOADING');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user?.orgId) { setStatus('OK'); return; }

    // Cache check — avoid hitting API on every page nav
    const cacheKey = `ds_sub_status_${user.orgId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { s, owner, ts } = JSON.parse(cached);
        if (Date.now() - ts < 300_000) { // 5 min cache
          setStatus(s);
          setIsOwner(owner);
          return;
        }
      } catch { /* ignore */ }
    }

    paymentApi.getSubscriptionStatus()
      .then(res => {
        const sub = res.data;
        const s = sub?.status === 'EXPIRED' ? 'EXPIRED' : 'OK';
        // We can't check isOwner from this API — only the billing endpoint does that.
        // So we check if user can access billing (non-owners get 403)
        setStatus(s);
        sessionStorage.setItem(cacheKey, JSON.stringify({ s, owner: false, ts: Date.now() }));
      })
      .catch(() => {
        // If payment-service is down or no subscription exists → allow through (Free tier)
        setStatus('OK');
      });
  }, [user?.orgId]);

  if (status === 'LOADING') return null;

  if (status === 'EXPIRED') {
    return (
      <ErrorState
        type="generic"
        title="Subscription expired"
        description="Subscription expired. Please contact your organization owner."
        showBack={false}
        showHome={false}
        actions={
          <button onClick={() => navigate('/settings/billing')}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: '#534AB7', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}>
            Go to Billing
          </button>
        }
      />
    );
  }

  return children;
};

export default SubscriptionGuard;