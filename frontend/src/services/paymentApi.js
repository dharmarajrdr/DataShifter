import { apiClient } from './apiClient';

export const paymentApi = {
  getBilling: () => apiClient.get('/payments/billing'),
  getPlans: () => apiClient.get('/payments/plans'),
  getHistory: (page = 0, size = 10) => apiClient.get(`/payments/history?page=${page}&size=${size}`),
  createCheckout: (payload) => apiClient.post('/payments/checkout', payload),
  verifyPayment: (payload) => apiClient.post('/payments/verify', payload),
  cancelPayment: (orderId) => apiClient.post('/payments/cancel', { orderId }),
  getSubscriptionStatus: () => apiClient.get('/payments/subscription/status'),
};