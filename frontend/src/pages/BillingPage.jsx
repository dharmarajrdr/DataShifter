import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { FRSC, FRBC } from '../constants/layouts';
import { PageHeader, Button, Chip, Loader, ApiGuard } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { paymentApi } from '../services/paymentApi';
import SettingsTabs from '../components/common/SettingsTabs';

const CYCLE_LABELS = { MONTHLY: 'Monthly', HALF_YEARLY: 'Half-yearly', YEARLY: 'Yearly' };
const CYCLE_SUFFIX = { MONTHLY: '/mo', HALF_YEARLY: '/6mo', YEARLY: '/yr' };

const formatPrice = (paise, currency = 'INR') => {
  const amount = paise / 100;
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_COLORS = {
  SUCCESS: { bg: COLORS.status.successLight, text: COLORS.status.successText },
  FAILED: { bg: COLORS.status.errorLight, text: COLORS.status.errorText },
  PENDING: { bg: COLORS.status.warningLight, text: COLORS.status.warningText },
  ACTIVE: { bg: COLORS.status.successLight, text: COLORS.status.successText },
  EXPIRED: { bg: COLORS.status.errorLight, text: COLORS.status.errorText },
};

const PLAN_FEATURES = {
  Free: ['2 pipelines', '2 connections', '50K rows/month', '2 members', 'Community support'],
  Starter: ['10 pipelines', '10 connections', '5M rows/month', '5 members', '2 parallel runs', 'Email support'],
  Pro: ['50 pipelines', '50 connections', '100M rows/month', '20 members', '5 parallel runs', 'Priority support'],
  Business: ['200 pipelines', '200 connections', '1B rows/month', '50 members', '10 parallel runs', 'Dedicated support'],
  Enterprise: ['Unlimited pipelines', 'Unlimited connections', 'Unlimited rows', 'Unlimited members', 'Unlimited parallel runs', '24/7 dedicated support'],
};

/* ================================================================
   PLAN CARD
   ================================================================ */
const PlanCard = ({ plan, cycle, currentPlanId, onSelect, selecting }) => {
  const isCurrent = plan.id === currentPlanId;
  const price = cycle === 'MONTHLY' ? plan.priceMonthly : cycle === 'HALF_YEARLY' ? plan.priceHalfYearly : plan.priceYearly;
  const features = PLAN_FEATURES[plan.name] || [];

  return (
    <div style={{
      border: `${plan.featured ? '2px' : '1px'} solid ${plan.featured ? COLORS.brand.primary : COLORS.border.light}`,
      borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, background: '#fff', position: 'relative',
      flex: '1 1 0', minWidth: 180,
    }}>
      {plan.featured && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          background: COLORS.brand.primary, color: '#fff', fontSize: '10px', fontWeight: 600,
          padding: '2px 12px', borderRadius: '10px', letterSpacing: '0.5px',
        }}>POPULAR</div>
      )}
      <p style={{ fontSize: FONT.size.lg, fontWeight: 600, marginBottom: '4px' }}>{plan.name}</p>
      <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginBottom: SPACING.sm, minHeight: 32 }}>
        {plan.description}
      </p>
      <p style={{ fontSize: '26px', fontWeight: 700, color: COLORS.text.primary, marginBottom: '2px' }}>
        {formatPrice(price, plan.currency)}
      </p>
      <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, marginBottom: SPACING.md }}>
        {price > 0 ? CYCLE_SUFFIX[cycle] : 'forever'}
      </p>
      <div style={{ marginBottom: SPACING.md }}>
        {features.map((f, i) => (
          <div key={i} style={{ ...FRSC, gap: '6px', marginBottom: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 7L6 9.5L10.5 4.5" stroke={COLORS.status.success} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>{f}</span>
          </div>
        ))}
      </div>
      {isCurrent ? (
        <div style={{
          padding: '8px', textAlign: 'center', borderRadius: BORDER_RADIUS.md,
          background: COLORS.brand.primaryLight, color: COLORS.brand.primary,
          fontSize: FONT.size.sm, fontWeight: 600,
        }}>Current plan</div>
      ) : price === 0 ? (
        <div style={{
          padding: '8px', textAlign: 'center', borderRadius: BORDER_RADIUS.md,
          background: COLORS.background.secondary, color: COLORS.text.tertiary,
          fontSize: FONT.size.sm, fontWeight: 500,
        }}>Free tier</div>
      ) : (
        <Button onClick={() => onSelect(plan.id)} disabled={selecting}
          style={{ width: '100%', justifyContent: 'center' }}>
          {selecting ? 'Processing...' : 'Upgrade'}
        </Button>
      )}
    </div>
  );
};

/* ================================================================
   BILLING PAGE
   ================================================================ */
const BillingPage = () => {
  const { user } = useAuth();
  const [billing, setBilling] = useState(null);
  const [cycle, setCycle] = useState('YEARLY');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [history, setHistory] = useState(null);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentApi.getBilling();
      setBilling(res.data);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async (page) => {
    try {
      const res = await paymentApi.getHistory(page, 10);
      setHistory(res.data);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);
  useEffect(() => { fetchHistory(historyPage); }, [historyPage, fetchHistory]);

  const handleSelectPlan = async (planId) => {
    setSelecting(true);
    try {
      const res = await paymentApi.createCheckout({ planId, billingCycle: cycle, provider: 'RAZORPAY' });
      const checkout = res.data;
      openRazorpay(checkout);
    } catch (e) {
      setError(e);
      setSelecting(false);
    }
  };

  const openRazorpay = (checkout) => {
    const options = {
      key: checkout.key,
      amount: checkout.amount,
      currency: checkout.currency,
      name: 'DataShifter',
      description: `${checkout.planName} (${CYCLE_LABELS[checkout.billingCycle]})`,
      order_id: checkout.orderId,
      handler: async (response) => {
        try {
          await paymentApi.verifyPayment({
            provider: 'RAZORPAY',
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          fetchBilling();
          fetchHistory(0);
        } catch (e) { setError(e); }
        finally { setSelecting(false); }
      },
      prefill: { email: user?.email },
      theme: { color: '#534AB7' },
      modal: {
        ondismiss: () => {
          paymentApi.cancelPayment(checkout.orderId).catch(() => {});
          setSelecting(false);
          fetchHistory(0);
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const sub = billing?.subscription;
  const plans = billing?.plans || [];

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<Loader variant="line" />}>
      <div>
        <SettingsTabs title="Billing" subtitle="Manage your subscription and payment history" />

        <div style={{ maxWidth: '100%', paddingTop: SPACING.xl }}>

          {/* Current subscription */}
          {sub && (
            <div style={{
              padding: SPACING.lg, background: '#fff', border: `1px solid ${COLORS.border.light}`,
              borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.xl,
            }}>
              <div style={{ ...FRBC }}>
                <div>
                  <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Current plan
                  </p>
                  <p style={{ fontSize: FONT.size.xl, fontWeight: 600 }}>
                    {sub.planName}
                    <Chip label={sub.status} colorScheme={sub.status === 'ACTIVE' ? 'teal' : 'error'} style={{ marginLeft: '8px' }} />
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                    {sub.billingCycle} · Expires {formatDate(sub.expiresAt)}
                  </p>
                  <p style={{
                    fontSize: FONT.size.base, fontWeight: 600, marginTop: '2px',
                    color: sub.daysRemaining <= 7 ? COLORS.status.error : COLORS.text.primary,
                  }}>
                    {sub.daysRemaining} days remaining
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cycle toggle */}
          <div style={{ ...FRSC, justifyContent: 'center', gap: '4px', marginBottom: SPACING.lg }}>
            {['MONTHLY', 'HALF_YEARLY', 'YEARLY'].map(c => (
              <button key={c} onClick={() => setCycle(c)}
                style={{
                  padding: '7px 16px', borderRadius: BORDER_RADIUS.pill, border: 'none',
                  fontSize: FONT.size.sm, fontWeight: cycle === c ? 600 : 400, cursor: 'pointer',
                  background: cycle === c ? COLORS.brand.primary : COLORS.background.secondary,
                  color: cycle === c ? '#fff' : COLORS.text.secondary,
                  transition: 'all 0.15s ease',
                }}>
                {CYCLE_LABELS[c]}
                {c === 'YEARLY' && <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.8 }}>Save 25%</span>}
              </button>
            ))}
          </div>

          {/* Plan cards */}
          <div style={{ display: 'flex', gap: SPACING.md, marginBottom: SPACING.xxl, flexWrap: 'wrap' }}>
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} cycle={cycle}
                currentPlanId={sub?.planId} onSelect={handleSelectPlan} selecting={selecting} />
            ))}
          </div>

          {/* Payment history */}
          {history && history.payments && history.payments.length > 0 && (
            <>
              <p style={{ fontSize: FONT.size.base, fontWeight: 600, marginBottom: SPACING.sm }}>Payment history</p>
              <div style={{
                border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT.size.sm }}>
                  <thead>
                    <tr style={{ background: COLORS.background.secondary }}>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Plan</th>
                      <th style={thStyle}>Cycle</th>
                      <th style={thStyle}>Amount</th>
                      <th style={thStyle}>Provider</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.payments.map(p => {
                      const sc = STATUS_COLORS[p.status] || STATUS_COLORS.PENDING;
                      return (
                        <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.border.light}` }}>
                          <td style={tdStyle}>{formatDateTime(p.paidAt || p.createdAt)}</td>
                          <td style={tdStyle}><strong>{p.planName}</strong></td>
                          <td style={tdStyle}>{CYCLE_LABELS[p.billingCycle] || p.billingCycle}</td>
                          <td style={tdStyle}>{formatPrice(p.amount, p.currency)}</td>
                          <td style={tdStyle}>{p.paymentProvider}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                              background: sc.bg, color: sc.text,
                            }}>{p.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {history.totalPayments > 10 && (
                <div style={{ ...FRSC, justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.sm }}>
                  <button disabled={historyPage === 0} onClick={() => setHistoryPage(p => p - 1)}
                    style={pgBtn(historyPage === 0)}>Prev</button>
                  <span style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                    Page {historyPage + 1}
                  </span>
                  <button disabled={(historyPage + 1) * 10 >= history.totalPayments}
                    onClick={() => setHistoryPage(p => p + 1)}
                    style={pgBtn((historyPage + 1) * 10 >= history.totalPayments)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ApiGuard>
  );
};

const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px', color: '#555' };
const tdStyle = { padding: '10px 14px', color: '#555' };
const pgBtn = (disabled) => ({
  padding: '4px 10px', border: `1px solid ${COLORS.border.light}`, borderRadius: '4px',
  fontSize: '11px', background: disabled ? COLORS.background.secondary : '#fff',
  color: disabled ? COLORS.text.tertiary : COLORS.text.primary, cursor: disabled ? 'default' : 'pointer',
});

export default BillingPage;