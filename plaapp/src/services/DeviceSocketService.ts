import NetInfo from '@react-native-community/netinfo';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS as E } from '../utils/constants';
import { logger } from '../utils/logger';

type SocketHandler = (payload: unknown) => void;

class DeviceSocketService {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<SocketHandler>>();
  private deviceId: string | null = null;
  private connected = false;

  async connect(url: string, token: string, deviceId: string, deviceInfo: Record<string, unknown>): Promise<boolean> {
    if (!url) {
      logger.warn('Device socket URL is not configured');
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
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      }, 12000);
      socket.once(E.CONNECT, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(true);
      });
      socket.once('connect_error', (error) => {
        logger.warn('Device socket connection failed', error.message);
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(false);
        }
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

  isConnected(): boolean {
    return this.connected && Boolean(this.socket?.connected);
  }

  clearHandlers(): void {
    this.handlers.clear();
  }

  disconnect(clearHandlers = true): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
    if (clearHandlers) this.handlers.clear();
  }

  private attach(socket: Socket, deviceInfo: Record<string, unknown>): void {
    socket.on(E.CONNECT, () => {
      this.connected = true;
      this.emit(E.CONNECTED, {});
      if (this.deviceId) socket.emit(E.DEVICE_REGISTER, { deviceId: this.deviceId, deviceInfo });
    });
    socket.on(E.DISCONNECT, (reason) => {
      this.connected = false;
      this.emit(E.DISCONNECTED, { reason });
    });

    const events = [
      E.NOTIFICATION_NEW,
      E.NOTIFICATION_BROADCAST,
      E.SYSTEM_ANNOUNCEMENT,
      E.WALLET_UPDATED,
      E.MATCH_RESULT_READY,
      E.MATCH_SUBMISSION_RECEIVED,
      E.MATCH_POSTPONE_RESPONSE,
      E.MATCH_DISPUTE_OPENED,
      E.LEADERBOARD_UPDATED,
      E.DEVICE_REGISTER_SUCCESS,
      E.DEVICE_REGISTER_ERROR,
      E.DEVICE_SESSION_REPLACED,
    ];
    for (const event of events) socket.on(event, (payload) => this.emit(event, payload));

    socket.on(E.PING, (payload) => socket.emit(E.PONG, payload));
  }

  private emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        logger.error(`Socket event handler failed: ${event}`, error);
      }
    });
  }
}

export default new DeviceSocketService();
