import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { EXPO_PUBLIC_PROJECT_ID } from '../utils/constants';
import { logger } from '../utils/logger';

export type NativeNotification = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type NotificationHandler = (
  type: 'NOTIFICATION_RECEIVED' | 'NOTIFICATION_TAPPED',
  payload: unknown,
) => void;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private token: string | null = null;
  private handler: NotificationHandler | null = null;
  private receivedSubscription: Notifications.Subscription | null = null;
  private responseSubscription: Notifications.Subscription | null = null;

  async initialize(handler: NotificationHandler): Promise<string | null> {
    this.handler = handler;
    this.removeListeners();

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      logger.info('Notification permission was not granted');
      return null;
    }

    if (!Device.isDevice) {
      logger.info('Push token registration requires a physical device');
      this.setupListeners();
      return null;
    }

    if (!EXPO_PUBLIC_PROJECT_ID) {
      logger.warn('Push token unavailable: configure the EAS project ID');
      this.setupListeners();
      return null;
    }

    try {
      this.token = (await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PUBLIC_PROJECT_ID,
      })).data;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    } catch (error) {
      logger.warn('Push-token registration failed', error);
    }

    this.setupListeners();
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse) {
      this.handler?.('NOTIFICATION_TAPPED', lastResponse.notification.request.content.data);
    }
    return this.token;
  }

  async requestPermission(): Promise<string> {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return current.status;
    return (await Notifications.requestPermissionsAsync()).status;
  }

  async show(notification: NativeNotification): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {},
        sound: 'default',
      },
      trigger: null,
    });
  }

  getToken(): string | null {
    return this.token;
  }

  cleanup(): void {
    this.removeListeners();
    this.handler = null;
  }

  private setupListeners(): void {
    this.receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      this.handler?.('NOTIFICATION_RECEIVED', notification.request.content);
    });
    this.responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      this.handler?.('NOTIFICATION_TAPPED', response.notification.request.content.data);
    });
  }

  private removeListeners(): void {
    this.receivedSubscription?.remove();
    this.responseSubscription?.remove();
    this.receivedSubscription = null;
    this.responseSubscription = null;
  }
}

export default new NotificationService();
