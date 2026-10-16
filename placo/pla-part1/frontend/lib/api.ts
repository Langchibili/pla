import { API_URL, TOKEN_KEY } from './config';
import type { Formation, GameProfile, IssuedMatch, LeaderRow, MarketOffer, MatchRecord, Squad, Wallet } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (t: string | null) => { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); };
export const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

async function request<T>(path: string, init: RequestInit & { idempotent?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(init.headers as any) };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  if (init.idempotent) headers['x-idempotency-key'] = init.idempotent;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
  return body as T;
}
const unwrap = async <T,>(p: Promise<{ data: T }>) => (await p).data;
const post = (path: string, body?: unknown, idempotent?: string) =>
  request<any>(path, { method: 'POST', body: JSON.stringify(body ?? {}), idempotent });

export const api = {
  login: async (identifier: string, password: string) =>
    request<{ jwt: string }>('/auth/local', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  register: async (username: string, email: string, password: string) =>
    request<{ jwt: string }>('/auth/local/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),

  profile: () => unwrap<GameProfile>(request('/me/game-profile')),
  initialise: (club_name: string, public_handle?: string) => unwrap<any>(post('/me/game-profile/initialise', { club_name, public_handle })),
  wallet: () => unwrap<Wallet & { recent_transactions: any[] }>(request('/me/coin-wallet')),

  squad: (clubId: string) => unwrap<Squad>(request(`/clubs/${clubId}/squad`)),
  chooseFormation: (clubId: string, formation_code: string) => unwrap<any>(post(`/clubs/${clubId}/formation`, { formation_code })),
  chooseStadium: (clubId: string, stadium_code: string) => unwrap<any>(post(`/clubs/${clubId}/stadium`, { stadium_code })),
  chooseKit: (clubId: string, kit_code: string) => unwrap<any>(post(`/clubs/${clubId}/kit`, { kit_code })),
  chooseManager: (clubId: string, manager_document_id: string) => unwrap<any>(post(`/clubs/${clubId}/manager`, { manager_document_id })),
  formations: async () => (await request<{ data: Formation[] }>('/formations?pagination[pageSize]=50&sort=sort_order')).data.filter(f => f.formation_game_status === 'active'),
  // Requires the small backend route GET /me/club (see backend-additions.md)
  myClub: () => unwrap<{ documentId: string; club_name: string } | null>(request('/me/club')),
  upgradePlayer: (playerId: string, attribute: string, coin_type: string) =>
    unwrap<any>(post(`/club-players/${playerId}/develop`, { attribute, coin_type }, newKey())),

  catalog: () => unwrap<MarketOffer[]>(request('/market-offers/catalog')),
  buy: (offerCode: string) => unwrap<any>(post(`/market-offers/${offerCode}/purchase`, {}, newKey())),

  leaderboard: (limit = 50) => unwrap<LeaderRow[]>(request(`/leaderboards/xp?limit=${limit}`)),
  myMatches: () => unwrap<MatchRecord[]>(request('/me/matches?limit=20')),

  startTraining: (ai_team_code: string, difficulty_code: string) =>
    unwrap<{ match: IssuedMatch }>(post('/training-sessions/start', { ai_team_code, difficulty_code }, newKey())),
  startMatch: (matchId: string) => unwrap<{ match: IssuedMatch }>(post(`/matches/${matchId}/start`)),
  enqueue: (match_mode: 'casual' | 'ranked') => unwrap<any>(post('/matchmaking/enqueue', { match_mode }, newKey())),
  cancelTicket: (code: string) => unwrap<any>(post(`/matchmaking/${code}/cancel`)),
};
