import { API_URL, PLA_TOKEN_KEY, TOKEN_KEY } from './config';
export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (t) => { if (t)
    localStorage.setItem(TOKEN_KEY, t);
else
    localStorage.removeItem(TOKEN_KEY); };
export const getPlaToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(PLA_TOKEN_KEY));
export const setPlaToken = (token) => {
    if (typeof window === 'undefined')
        return;
    if (token)
        localStorage.setItem(PLA_TOKEN_KEY, token);
    else
        localStorage.removeItem(PLA_TOKEN_KEY);
};
export function consumePlaTokenFromHash() {
    if (typeof window === 'undefined')
        return null;
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (!params.has('pla_jwt'))
        return null;
    const token = params.get('pla_jwt');
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (!token)
        return null;
    setPlaToken(token);
    return token;
}
export const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
async function request(path, init = {}) {
    const { auth = true, ...requestOptions } = init;
    const headers = { 'content-type': 'application/json', ...requestOptions.headers };
    const token = getToken();
    if (token && auth)
        headers.authorization = `Bearer ${token}`;
    if (init.idempotent)
        headers['x-idempotency-key'] = init.idempotent;
    const res = await fetch(`${API_URL}${path}`, { ...requestOptions, headers });
    const text = await res.text();
    let body = {};
    if (text) {
        try {
            body = JSON.parse(text);
        }
        catch {
            const message = res.ok ? 'Backend returned invalid JSON.' : `Request failed (${res.status}); backend returned invalid JSON.`;
            throw new ApiError(res.status, message);
        }
    }
    if (!res.ok)
        throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
    return body;
}
const unwrap = async (p) => (await p).data;
const post = (path, body, idempotent) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}), idempotent });
export const api = {
    exchangePlaToken: (pla_jwt) => request('/auth/pla/exchange', { method: 'POST', body: JSON.stringify({ pla_jwt }), auth: false }),
    profile: () => unwrap(request('/me/game-profile')),
    initialise: (club_name, public_handle) => unwrap(post('/me/game-profile/initialise', { club_name, public_handle })),
    wallet: () => unwrap(request('/me/coin-wallet')),
    squad: (clubId) => unwrap(request(`/clubs/${clubId}/squad`)),
    chooseFormation: (clubId, formation_code) => unwrap(post(`/clubs/${clubId}/formation`, { formation_code })),
    chooseStadium: (clubId, stadium_code) => unwrap(post(`/clubs/${clubId}/stadium`, { stadium_code })),
    chooseKit: (clubId, kit_code) => unwrap(post(`/clubs/${clubId}/kit`, { kit_code })),
    chooseManager: (clubId, manager_document_id) => unwrap(post(`/clubs/${clubId}/manager`, { manager_document_id })),
    formations: async () => (await request('/formations?pagination[pageSize]=50&sort=sort_order')).data.filter(f => f.formation_game_status === 'active'),
    stadiums: async () => (await request('/stadium-presets?pagination[pageSize]=50')).data.filter(s => s.stadium_game_status === 'active'),
    kits: async () => (await request('/kit-presets?pagination[pageSize]=50')).data.filter(k => k.kit_game_status === 'active'),
    managers: () => unwrap(request('/me/managers')),
    // Ownership-filtered route for the authenticated player's club.
    myClub: () => unwrap(request('/me/club')),
    upgradePlayer: (playerId, attribute, coin_type) => unwrap(post(`/club-players/${playerId}/develop`, { attribute, coin_type }, newKey())),
    catalog: () => unwrap(request('/market-offers/catalog')),
    buy: (offerCode) => unwrap(post(`/market-offers/${offerCode}/purchase`, {}, newKey())),
    leaderboard: (limit = 50) => unwrap(request(`/leaderboards/xp?limit=${limit}`)),
    myMatches: () => unwrap(request('/me/matches?limit=20')),
    startTraining: (ai_team_code, difficulty_code) => unwrap(post('/training-sessions/start', { ai_team_code, difficulty_code }, newKey())),
    startMatch: (matchId) => unwrap(post(`/matches/${matchId}/start`)),
    enqueue: (match_mode) => unwrap(post('/matchmaking/enqueue', { match_mode }, newKey())),
    cancelTicket: (code) => unwrap(post(`/matchmaking/${code}/cancel`)),
};
