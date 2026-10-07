'use client';
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
export function useSocketEvent(event, handler) {
  useEffect(() => { const s = getSocket(); if (!s) return; s.on(event, handler); return () => s.off(event, handler); }, [event, handler]);
}
export const emit = (event, payload) => getSocket()?.emit(event, { ...payload, idempotencyKey: crypto.randomUUID() });
