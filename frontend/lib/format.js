export const fmtPlapo = (n = 0) => new Intl.NumberFormat('en').format(n);
export const fmtMoney = (n = 0, code) => {
  if (!code) return new Intl.NumberFormat('en').format(n);
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(n); }
  catch { return `${code} ${n}`; }
};
export const fmtCurrencyAmount = (amount = 0, currency = {}) => {
  currency = currency || {};
  const formattedAmount = new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(amount) || 0);
  if (typeof currency.symbol === 'string' && currency.symbol.trim()) {
    return `${currency.symbol.trim()}${formattedAmount}`;
  }
  return currency.code ? `${currency.code}${formattedAmount}` : formattedAmount;
};
export const fmtDate = (d) => (d ? new Date(d).toLocaleString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const STATUS_COLOR = { scheduled: 'info', postponed: 'warning', awaiting_confirmation: 'warning', in_dispute: 'error', invalid: 'error', completed: 'success', forfeited: 'default', suspended: 'default', registration_open: 'success', in_progress: 'secondary', published: 'info' };
export const label = (s = '') => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const SCORE_FLAG = { pending: 'Reading screenshot…', processing: 'Reading screenshot…', valid: 'Screenshot accepted', invalid: 'Score not in the allowed area', needs_review: 'Sent for admin review', rejected: 'Rejected' };
