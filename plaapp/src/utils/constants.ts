import Constants from 'expo-constants';

export const APP_NAME = 'ProLeague Africa';
export const FRONTEND_URL = process.env.EXPO_PUBLIC_FRONTEND_URL ?? '';
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
export const DEVICE_SOCKET_URL = process.env.EXPO_PUBLIC_DEVICE_SOCKET_URL ?? '';
export const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  ?? Constants.easConfig?.projectId
  ?? Constants.expoConfig?.extra?.eas?.projectId
  ?? '';

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_BROADCAST: 'notification:broadcast',
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
  WALLET_UPDATED: 'wallet:updated',
  MATCH_RESULT_READY: 'match:result_ready',
  MATCH_SUBMISSION_RECEIVED: 'match:submission_received',
  MATCH_POSTPONE_RESPONSE: 'match:postpone_response',
  MATCH_DISPUTE_OPENED: 'match:dispute_opened',
  LEADERBOARD_UPDATED: 'leaderboard:updated',
  DEVICE_REGISTER: 'device:register',
  DEVICE_REGISTER_SUCCESS: 'device:register:success',
  DEVICE_REGISTER_ERROR: 'device:register:error',
  DEVICE_SESSION_REPLACED: 'device:session-replaced',
  DEVICE_HEARTBEAT: 'device:heartbeat',
  PING: 'ping',
  PONG: 'pong',
} as const;
