'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints, tokenStore } from '@/lib/api';
import { closeSocket } from '@/lib/socket';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setReady(true); return null; }
    try { const u = await endpoints.me(); setUser(u); return u; } catch { setUser(null); return null; } finally { setReady(true); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const signIn = async (identifier, password) => { const r = await endpoints.login({ identifier, password }); tokenStore.set(r.jwt); return refresh(); };
  const signUp = async (b) => { const r = await endpoints.register(b); tokenStore.set(r.jwt); return refresh(); };
  const signOut = () => { tokenStore.clear(); closeSocket(); setUser(null); location.href = '/login'; };
  const value = useMemo(() => ({ user, ready, refresh, signIn, signUp, signOut, setUser }), [user, ready, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
