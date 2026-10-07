import { io } from 'socket.io-client';
import { tokenStore } from './api';
let socket;
export const getSocket = () => {
  if (typeof window === 'undefined' || !tokenStore.get()) return null;
  if (!socket) socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:1337', { auth: { token: tokenStore.get() }, transports: ['websocket'], reconnectionDelayMax: 8000 });
  return socket;
};
export const closeSocket = () => { socket?.close(); socket = null; };
