'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, endpoints, tokenStore } from '@/lib/api';
import { closeSocket } from '@/lib/socket';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [authCheckError, setAuthCheckError] = useState(null);
  const refresh = useCallback(async () => {
    setAuthCheckError(null);
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
    } catch (error) {
      setUser(null);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        tokenStore.clear();
      } else {
        setAuthCheckError(error instanceof Error ? error.message : 'Could not check your PLA session.');
      }
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
    setAuthCheckError(null);
    setReady(true);
    return result.user;
  };
  const signOut = useCallback(() => { tokenStore.clear(); closeSocket(); setUser(null); router.replace('/login'); }, [router]);
  const value = useMemo(() => ({
    user, ready, authCheckError, refresh, requestOtp, resendOtp, verifyOtp, signOut, setUser,
  }), [user, ready, authCheckError, refresh, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
