'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, ApiError } from './api';
import type { GameProfile } from './types';

interface AuthState {
  ready: boolean; token: string | null; profile: GameProfile | null; clubId: string | null; needsOnboarding: boolean;
  login: (id: string, pw: string) => Promise<void>;
  register: (u: string, e: string, pw: string) => Promise<void>;
  logout: () => void; refresh: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('AuthProvider missing'); return c; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState<string | null>(null);
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [needsOnboarding, setNeeds] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) { setProfile(null); setClubId(null); setNeeds(false); return; }
    try {
      const p = await api.profile();
      setProfile(p); setNeeds(false);
      const club = await api.myClub().catch(() => null);
      setClubId(club?.documentId ?? null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) { setProfile(null); setNeeds(true); }
      else if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { setToken(null); setTok(null); }
      else throw e;
    }
  }, []);

  useEffect(() => { setTok(getToken()); load().catch(() => {}).finally(() => setReady(true)); }, [load]);

  const value = useMemo<AuthState>(() => ({
    ready, token, profile, clubId, needsOnboarding,
    login: async (id, pw) => { const r = await api.login(id, pw); setToken(r.jwt); setTok(r.jwt); await load(); },
    register: async (u, e, pw) => { const r = await api.register(u, e, pw); setToken(r.jwt); setTok(r.jwt); await load(); },
    logout: () => { setToken(null); setTok(null); setProfile(null); setClubId(null); },
    refresh: load,
  }), [ready, token, profile, clubId, needsOnboarding, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
