'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
// Tiny stale-while-revalidate hook with a shared cache
const cache = new Map();
export function useApi(key, fetcher, { interval, enabled = true } = {}) {
  const [data, setData] = useState(() => cache.get(key));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!cache.has(key));
  const fRef = useRef(fetcher); fRef.current = fetcher;
  const load = useCallback(async () => {
    try { const d = await fRef.current(); cache.set(key, d); setData(d); setError(null); }
    catch (e) { setError(e); } finally { setLoading(false); }
  }, [key]);
  useEffect(() => { if (!enabled) return; load(); if (!interval) return; const t = setInterval(load, interval); return () => clearInterval(t); }, [load, interval, enabled]);
  return { data, error, loading, reload: load };
}
