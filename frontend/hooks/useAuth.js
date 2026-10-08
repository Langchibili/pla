'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { endpoints, tokenStore } from '@/lib/api';
import { closeSocket } from '@/lib/socket';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setReady(true); return null; }
    try {
      const user = await endpoints.me();
      let nextUser = user;
      try {
        const wallet = await endpoints.wallet();
        nextUser = { ...user, ...wallet };
      } catch (error) {
        console.error('Unable to load wallet balances', error);
      }
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
  }, [refresh]);
  const requestOtp = (email, purpose, referralCode, deviceHash, countryId) => endpoints.sendEmailOtp({
    email,
    purpose,
    referral_code: referralCode,
    device_hash: deviceHash,
    country_id: countryId,
  });
  const resendOtp = (email, purpose, referralCode, deviceHash, countryId) => endpoints.resendEmailOtp({
    email,
    purpose,
    referral_code: referralCode,
    device_hash: deviceHash,
    country_id: countryId,
  });
  const verifyOtp = async (email, code, purpose) => {
    const result = await endpoints.verifyEmailOtp({ email, code, purpose });
    tokenStore.set(result.jwt);
    setUser(result.user);
    setReady(true);
    return result.user;
  };
  const signOut = useCallback(() => { tokenStore.clear(); closeSocket(); setUser(null); router.replace('/login'); }, [router]);
  const value = useMemo(() => ({ user, ready, refresh, requestOtp, resendOtp, verifyOtp, signOut, setUser }), [user, ready, refresh, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
