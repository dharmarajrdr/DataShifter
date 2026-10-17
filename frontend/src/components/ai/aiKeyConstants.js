export const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

export const STATUS_BADGE = {
  ACTIVE: { bg: '#E6F4EA', color: '#0F6E56', label: 'Active', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RATE_LIMITED: { bg: '#FEF3C7', color: '#92400E', label: 'Cooldown (Rate Limited)', badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPIRED: { bg: '#FEE2E2', color: '#A32D2D', label: 'Invalid / Expired', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200' },
  FAILED: { bg: '#FEE2E2', color: '#A32D2D', label: 'Failed', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

