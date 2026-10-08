import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const INSTALLATION_KEY = 'pla_installation_id';

export async function getDeviceInfo() {
  let deviceId = Platform.OS === 'web'
    ? Constants.installationId ?? ''
    : await SecureStore.getItemAsync(INSTALLATION_KEY);

  if (!deviceId) {
    deviceId = Crypto.randomUUID();
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(INSTALLATION_KEY, deviceId);
    }
  }

  return {
    deviceId,
    deviceName: Device.deviceName ?? 'Unknown device',
    platform: Platform.OS,
    platformVersion: String(Platform.Version),
    manufacturer: Device.manufacturer ?? 'Unknown',
    modelName: Device.modelName ?? 'Unknown',
    osName: Device.osName ?? Platform.OS,
    osVersion: Device.osVersion ?? String(Platform.Version),
    appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0',
    buildNumber: Application.nativeBuildVersion ?? '1',
    expoVersion: Constants.expoVersion ?? 'Unknown',
    isDevice: Device.isDevice,
    totalMemory: Device.totalMemory ?? null,
  };
}
