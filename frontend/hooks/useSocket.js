'use client';
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { tokenStore } from '@/lib/api';
export function useSocketEvent(event, handler) {
  const token = tokenStore.get();
  useEffect(() => { const s = getSocket(); if (!s) return; s.on(event, handler); return () => s.off(event, handler); }, [event, handler, token]);
}
export function useSocketRoom(roomType, roomId) {
  const token = tokenStore.get();
  useEffect(() => {
    if (!roomId || !token) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit(`watch:${roomType}`, String(roomId));
    return () => socket.emit(`unwatch:${roomType}`, String(roomId));
  }, [roomType, roomId, token]);
}
export const emit = (event, payload) => getSocket()?.emit(event, { ...payload, idempotencyKey: crypto.randomUUID() });
