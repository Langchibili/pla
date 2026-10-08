export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: string;
  platformVersion: string | number;
  manufacturer: string;
  modelName: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  expoVersion: string;
  isDevice: boolean;
  totalMemory: number | null;
}