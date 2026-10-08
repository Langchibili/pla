import { io } from 'socket.io-client';
import { tokenStore } from './api';
let socket;
export const getSocket = () => {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window === 'undefined' || !tokenStore.get() || !socketUrl) return null;
  if (!socket) socket = io(socketUrl, { auth: { token: tokenStore.get() }, transports: ['websocket'], reconnectionDelayMax: 8000 });
  return socket;
};
export const closeSocket = () => { socket?.close(); socket = null; };
