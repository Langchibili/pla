import NetInfo from '@react-native-community/netinfo';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS as E } from '../utils/constants';
import { logger } from '../utils/logger';

type SocketHandler = (payload: unknown) => void;

const PLA_EVENTS = [
  E.NOTIFICATION.NEW,
  E.NOTIFICATION.BROADCAST,
  E.SYSTEM.ANNOUNCEMENT,
  E.WALLET.UPDATED,
  E.MATCH.RESULT_READY,
  E.MATCH.SUBMISSION_RECEIVED,
  E.MATCH.POSTPONE_RESPONSE,
  E.MATCH.DISPUTE_OPENED,
  E.LEADERBOARD.UPDATED,
  E.DEVICE.REGISTER_SUCCESS,
  E.DEVICE.REGISTER_ERROR,
  E.DEVICE.SESSION_REPLACED,
] as const;

class DeviceSocketService {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<SocketHandler>>();
  private deviceId: string | null = null;
  private connected = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  async connect(
    url: string,
    token: string,
    deviceId: string,
    deviceInfo: Record<string, unknown>,
  ): Promise<boolean> {
    if (!url || !token || !deviceId) {
      logger.warn('Cannot connect the device socket without its URL and signed-in session');
      return false;
    }

    const network = await NetInfo.fetch();
    if (!network.isConnected) return false;

    this.disconnect(false);
    this.deviceId = deviceId;
    const socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 10000,
    });
    this.socket = socket;
    this.attach(socket, deviceInfo);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (connected: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(connected);
      };
      const timeout = setTimeout(() => finish(false), 12000);
      socket.once(E.CONNECT, () => finish(true));
      socket.once(E.CONNECTION.CONNECT_ERROR, (error) => {
        logger.warn('PLA device socket connection failed', error.message);
        finish(false);
      });
    });
  }

  on(event: string, handler: SocketHandler): () => void {
    const handlers = this.handlers.get(event) ?? new Set<SocketHandler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    return () => {
      handlers.delete(handler);
      if (!handlers.size) this.handlers.delete(event);
    };
  }

  clearHandlers(): void {
    this.handlers.clear();
  }

  disconnect(clearHandlers = true): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
    this.deviceId = null;
    if (clearHandlers) this.handlers.clear();
  }

  isConnected(): boolean {
    return this.connected && Boolean(this.socket?.connected);
  }

  private attach(socket: Socket, deviceInfo: Record<string, unknown>): void {
    socket.on(E.CONNECT, () => {
      this.connected = true;
      this.emit(E.CONNECTED, {});
      if (this.deviceId) {
        socket.emit(E.DEVICE.REGISTER, { deviceId: this.deviceId, deviceInfo });
        this.heartbeat = setInterval(() => {
          if (this.deviceId && socket.connected) {
            socket.emit(E.DEVICE.HEARTBEAT, { deviceId: this.deviceId });
          }
        }, 30000);
      }
    });
    socket.on(E.DISCONNECT, (reason) => {
      this.connected = false;
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = null;
      this.emit(E.DISCONNECTED, { reason });
    });

    for (const event of PLA_EVENTS) {
      socket.on(event, (payload) => this.emit(event, payload));
    }

    socket.on(E.CONNECTION.PING, (payload) => socket.emit(E.CONNECTION.PONG, payload));
  }

  private emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        logger.error(`Device socket event handler failed: ${event}`, error);
      }
    });
  }
}

export default new DeviceSocketService();
