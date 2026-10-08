import DeviceSocketService from './DeviceSocketService';
import NotificationService from './NotificationService';
import { API_URL, DEVICE_SOCKET_URL } from '../utils/constants';
import { getDeviceInfo } from '../utils/device-info';

class BackgroundService {
  async start(userId: number | string, token: string, notify: (type: string, payload: unknown) => void): Promise<boolean> {
    const deviceInfo = await getDeviceInfo();
    const deviceId = String(deviceInfo.deviceId);
    const notificationToken = await NotificationService.initialize((type, payload) => notify(type, payload));
    if (notificationToken) {
      if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL is required to register push notifications');
      const pushResponse = await fetch(`${API_URL.replace(/\/+$/, '')}/users/${encodeURIComponent(String(userId))}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ push_token: notificationToken }),
      });
      if (!pushResponse.ok) {
        throw new Error(`Could not register push token with PLA backend (HTTP ${pushResponse.status})`);
      }
    }
    return DeviceSocketService.connect(DEVICE_SOCKET_URL, token, deviceId, deviceInfo);
  }

  async stop(): Promise<void> {
    DeviceSocketService.disconnect();
    NotificationService.cleanup();
  }

  isConnected(): boolean {
    return DeviceSocketService.isConnected();
  }
}

export default new BackgroundService();
