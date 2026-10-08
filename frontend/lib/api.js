export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1377/api';
const KEY = 'pla_jwt';
export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(KEY)),
  set: (t) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
};
export const mediaUrl = (media) => {
  if (!media?.url) return null;
  if (/^https?:\/\//i.test(media.url)) return media.url;
  const apiRoot = API.replace(/\/api\/?$/, '');
  return `${apiRoot}${media.url.startsWith('/') ? '' : '/'}${media.url}`;
};

export class ApiError extends Error {
  constructor(msg, status, details) { super(msg); this.status = status; this.details = details; }
}
export async function api(path, { method = 'GET', body, form, auth = true, signal } = {}) {
  const headers = {};
  const t = tokenStore.get();
  if (auth && t) headers.Authorization = `Bearer ${t}`;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(API + path, { method, headers, signal, body: form || (body ? JSON.stringify(body) : undefined) });
  } catch { throw new ApiError('No connection. Check your data and retry.', 0); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth) { tokenStore.clear(); if (typeof window !== 'undefined' && !location.pathname.startsWith('/login')) location.href = '/login'; }
    throw new ApiError(json?.error?.message || 'Something went wrong', res.status, json?.error?.details);
  }
  return json;
}
const data = (p) => p.then((r) => r.data ?? r);
// Strapi 5 returns flat documents: { data, meta }
export const endpoints = {
  countries: () => data(api('/countries?filters[country_status][$eq]=active&populate[default_currency]=true&sort=name:asc', { auth: false })),
  sendEmailOtp: (b) => api('/auth/email-otp/send', { method: 'POST', body: b, auth: false }),
  resendEmailOtp: (b) => api('/auth/email-otp/resend', { method: 'POST', body: b, auth: false }),
  verifyEmailOtp: (b) => api('/auth/email-otp/verify', { method: 'POST', body: b, auth: false }),
  trackAffiliateImpression: (b) => api('/affiliate-impressions/track', { method: 'POST', body: b, auth: false }),
  checkAffiliateImpression: (b) => api('/affiliate-impressions/check', { method: 'POST', body: b, auth: false }),
  me: () => api('/users/me?populate[0]=country&populate[1]=preferred_currency'),
  updateMe: (id, b) => api(`/users/${id}`, { method: 'PUT', body: b }),
  tournaments: (q = '') => data(api(`/tournaments?populate[0]=game&populate[1]=country&populate[2]=banner&sort=starts_at:asc&filters[tournament_status][$in][0]=published&filters[tournament_status][$in][1]=registration_open&filters[tournament_status][$in][2]=in_progress${q}`)),
  tournament: (id) => data(api(`/tournaments/${id}?populate[0]=game&populate[1]=country&populate[2]=banner&populate[3]=stages&populate[4]=prize_pool_currency`)),
  entries: (id) => data(api(`/tournament-entries/leaderboard?tournament_id=${encodeURIComponent(id)}`)),
  // Custom routes you add in Strapi (see README)
  enter: (id, inGameName) => api('/tournament-entries/join', { method: 'POST', body: { tournament_id: id, in_game_name: inGameName } }),
  myMatches: () => data(api('/me/matches')),
  match: (id) => data(api(`/me/matches/${id}`)),
  submitResult: (id, file) => { const form = new FormData(); form.append('match_id', String(id)); form.append('screenshot', file); return api('/match-submissions/submit', { method: 'POST', form }); },
  matchAction: (id, action, body) => api(`/matches/${id}/${action}`, { method: 'POST', body }),
  wallet: () => data(api('/me/wallet')),
  transfer: (b) => api('/me/wallet/transfer', { method: 'POST', body: { ...b, idempotency_key: crypto.randomUUID() } }),
  packages: () => data(api('/plapo-packages?populate=currency&sort=sort_order:asc&filters[plapo_package_status][$eq]=active')),
  referrals: () => data(api('/me/referrals')),
  stageSchedule: (id) => data(api(`/tournament-stages/${encodeURIComponent(id)}/schedule`, { auth: false })),
};
