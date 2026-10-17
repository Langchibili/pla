'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, consumePlaTokenFromHash, getPlaToken, getToken, setPlaToken, setToken, ApiError } from './api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('AuthProvider missing');
    return context;
};

const errorMessage = error => error instanceof Error ? error.message : 'The request failed.';

export function AuthProvider({ children }) {
    const [ready, setReady] = useState(false);
    const [token, setCurrentToken] = useState(null);
    const [profile, setProfile] = useState(null);
    const [clubId, setClubId] = useState(null);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const clearSession = useCallback(() => {
        setToken(null);
        setCurrentToken(null);
        setProfile(null);
        setClubId(null);
        setNeedsOnboarding(false);
    }, []);

    const load = useCallback(async () => {
        setLoadError(null);
        if (!getToken()) {
            setProfile(null);
            setClubId(null);
            setNeedsOnboarding(false);
            return;
        }

        let nextProfile;
        try {
            nextProfile = await api.profile();
        }
        catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                setProfile(null);
                setClubId(null);
                setNeedsOnboarding(true);
                return;
            }
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                clearSession();
                return;
            }
            setLoadError(errorMessage(error));
            return;
        }

        setProfile(nextProfile);
        setNeedsOnboarding(false);
        try {
            const club = await api.myClub();
            setClubId(club?.documentId ?? null);
        }
        catch (error) {
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                clearSession();
                return;
            }
            setClubId(null);
            setLoadError(errorMessage(error));
        }
    }, [clearSession]);

    useEffect(() => {
        let active = true;
        queueMicrotask(async () => {
            if (!active)
                return;
            try {
                const incomingPlaToken = consumePlaTokenFromHash();
                const plaToken = incomingPlaToken ?? (!getToken() ? getPlaToken() : null);
                if (incomingPlaToken) {
                    setToken(null);
                    setCurrentToken(null);
                }
                if (plaToken) {
                    const result = await api.exchangePlaToken(plaToken);
                    if (!active)
                        return;
                    setToken(result.jwt);
                }
                if (!active)
                    return;
                setCurrentToken(getToken());
                await load();
            }
            catch (error) {
                if (active)
                    setLoadError(errorMessage(error));
            }
            finally {
                if (active)
                    setReady(true);
            }
        });
        return () => {
            active = false;
        };
    }, [load]);

    const value = useMemo(() => ({
        ready,
        token,
        profile,
        clubId,
        needsOnboarding,
        loadError,
        logout: () => {
            clearSession();
            setPlaToken(null);
            setLoadError(null);
        },
        refresh: load,
    }), [ready, token, profile, clubId, needsOnboarding, loadError, load, clearSession]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
