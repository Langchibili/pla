import Constants from 'expo-constants';

const environment = "local"
//const environment = "production" as string


export const EXPO_PUBLIC_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  ?? Constants.easConfig?.projectId
  ?? Constants.expoConfig?.extra?.eas?.projectId
  ?? '';

export const SOCKET_EVENTS = {
  CONNECT: 'connect', DISCONNECT: 'disconnect', CONNECTED: 'connected', DISCONNECTED: 'disconnected',
  WALLET: {
    UPDATED: 'wallet:updated',
  },
  MATCH: {
    RESULT_READY: 'match:result_ready',
    SUBMISSION_RECEIVED: 'match:submission_received',
    POSTPONE_RESPONSE: 'match:postpone_response',
    DISPUTE_OPENED: 'match:dispute_opened',
  },
  LEADERBOARD: {
    UPDATED: 'leaderboard:updated',
  },
  NOTIFICATION: { NEW: 'notification:new', BROADCAST: 'notification:broadcast' },
  SYSTEM: { ANNOUNCEMENT: 'system:announcement' },
  DEVICE: {
    REGISTER: 'device:register', REGISTER_SUCCESS: 'device:register:success', REGISTER_ERROR: 'device:register:error',
    SESSION_REPLACED: 'device:session-replaced', HEARTBEAT: 'device:heartbeat',
  },
  CONNECTION: { PING: 'ping', PONG: 'pong', ERROR: 'error', CONNECT_ERROR: 'connect_error' },
};

export const WEBVIEW_EVENTS = {
  MATCH_RESULT_READY: 'MATCH_RESULT_READY',
  MATCH_SUBMISSION_RECEIVED: 'MATCH_SUBMISSION_RECEIVED',
  MATCH_POSTPONE_RESPONSE: 'MATCH_POSTPONE_RESPONSE',
  MATCH_DISPUTE_OPENED: 'MATCH_DISPUTE_OPENED',
  WALLET_UPDATED: 'WALLET_UPDATED',
  LEADERBOARD_UPDATED: 'LEADERBOARD_UPDATED',
  NOTIFICATION_NEW: 'NOTIFICATION_NEW',
  NOTIFICATION_BROADCAST: 'NOTIFICATION_BROADCAST',
  NOTIFICATION_RECEIVED: 'NOTIFICATION_RECEIVED',
  NOTIFICATION_TAPPED: 'NOTIFICATION_TAPPED',
  SOCKET_CONNECTED: 'SOCKET_CONNECTED',
  SOCKET_DISCONNECTED: 'SOCKET_DISCONNECTED',
  SOCKET_ERROR: 'SOCKET_ERROR',
  APP_RESUMED: 'APP_RESUMED',
  SESSION_REPLACED: 'SESSION_REPLACED',
};

export const NATIVE_EVENTS = {
  INITIALIZE_SERVICES: 'INITIALIZE_SERVICES',
  REQUEST_PERMISSION: 'REQUEST_PERMISSION',
  CHECK_PERMISSION: 'CHECK_PERMISSION',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  RECONNECT_SOCKET: 'RECONNECT_SOCKET',
  DISCONNECT_SOCKET: 'DISCONNECT_SOCKET',
};

export const CONSTANTS = {
  APP_NAME: 'ProLeague Africa',
  APP_VERSION: '1.0.1',
  DEVICE_SOCKET_URL: environment === "local" ? "http://192.168.43.207:3015/device-sockets" : "https://socket.proleagueafrica.com/device-sockets",
  MAIN_SOCKET_URL: environment === "local" ? "http://192.168.43.207:3015/main-sockets" : "https://socket.proleagueafrica.com/main-sockets",
  BACKEND_URL: environment === "local" ? "http://192.168.43.207:1377/api" : "https://api.proleagueafrica.com/api",

  FRONTEND_URLS: {
    player: environment === "local" ? "http://192.168.43.207:3011" : "https://proleagueafrica.com",
  },

  NOTIFICATION: { HEARTBEAT_INTERVAL: 30000 },
};

export default { SOCKET_EVENTS, WEBVIEW_EVENTS, NATIVE_EVENTS, CONSTANTS };
