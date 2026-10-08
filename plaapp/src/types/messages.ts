export interface WebViewMessage {
  type: string;
  requestId?: string;
  payload?: any;
}

export interface NativeResponse {
  type: string;
  requestId?: string;
  payload?: any;
  error?: string;
}

export type MessageType =
  | 'INITIALIZE_SERVICES'
  | 'DISCONNECT_SOCKET'
  | 'REQUEST_PERMISSION'
  | 'CHECK_PERMISSION'
  | 'SHOW_NOTIFICATION'
  | 'NOTIFICATION_RECEIVED'
  | 'NOTIFICATION_TAPPED'
  | 'SOCKET_CONNECTED'
  | 'SOCKET_DISCONNECTED';