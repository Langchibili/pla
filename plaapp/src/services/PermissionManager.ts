import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

class PermissionManager {
  async requestNotificationPermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    return (await Notifications.requestPermissionsAsync()).status === 'granted';
  }

  async check(permission: string): Promise<string> {
    if (permission !== 'notification') return 'unsupported';
    return (await Notifications.getPermissionsAsync()).status;
  }

  async request(permission: string): Promise<string> {
    if (permission !== 'notification') return 'unsupported';
    return (await this.requestNotificationPermission()) ? 'granted' : 'denied';
  }

  async openAppSettings(): Promise<void> {
    await Linking.openSettings();
  }
}

export default new PermissionManager();
