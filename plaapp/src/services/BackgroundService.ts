import DeviceSocketService from './DeviceSocketService';
import NotificationService from './NotificationService';
import { CONSTANTS } from '../utils/constants';
import { getDeviceInfo } from '../utils/device-info';
import { logger } from '../utils/logger';

type ServiceConfig = {
  userId: string | number;
  token: string;
};

class BackgroundService {
  async start({ userId, token }: ServiceConfig): Promise<boolean> {
    const deviceInfo = await getDeviceInfo();
    const notificationToken = NotificationService.getToken();

    if (notificationToken) {
      const response = await fetch(
        `${CONSTANTS.BACKEND_URL.replace(/\/+$/, '')}/users/${encodeURIComponent(String(userId))}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ push_token: notificationToken }),
        },
      );
      if (!response.ok) {
        logger.warn('Could not register the PLA push token', { status: response.status });
      }
    }

    return DeviceSocketService.connect(
      CONSTANTS.DEVICE_SOCKET_URL,
      token,
      deviceInfo.deviceId,
      deviceInfo,
    );
  }

  stop(): void {
    DeviceSocketService.disconnect();
  }

  isConnected(): boolean {
    return DeviceSocketService.isConnected();
  }
}

export default new BackgroundService();
