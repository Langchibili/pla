'use client';
import { useEffect, useState } from 'react';
export function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!target) return { text: '—', ms: 0, urgent: false, done: false };
  const ms = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const text = d ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return { text, ms, urgent: ms < 3600e3, done: ms === 0 };
}
