import messaging from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import { ClixVersion } from '../core/ClixVersion';
import { ClixDevice } from '../models/ClixDevice';
import { ClixUserProperty } from '../models/ClixUserProperty';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { UUID } from '../utils/UUID';
import { DeviceAPIService } from './DeviceAPIService';
import { StorageService } from './StorageService';

export class DeviceService {
  private deviceIdKey = 'clix_device_id';

  constructor(
    private readonly storageService: StorageService,
    private readonly deviceAPIService: DeviceAPIService
  ) {}

  private generateDeviceId(): string {
    return UUID.generate();
  }

  getCurrentDeviceId(): string {
    const existingId = this.storageService.get<string>(this.deviceIdKey);
    if (existingId) {
      return existingId;
    }

    const newDeviceId = this.generateDeviceId();
    this.storageService.set(this.deviceIdKey, newDeviceId);

    ClixLogger.debug(`Generated new device ID: ${newDeviceId}`);
    return newDeviceId;
  }

  async createDevice(): Promise<ClixDevice> {
    const deviceId = this.getCurrentDeviceId();
    const platform = DeviceInfo.getSystemName();
    const osName = DeviceInfo.getSystemName();
    const osVersion = DeviceInfo.getSystemVersion();
    const manufacturer = await DeviceInfo.getManufacturer();
    const model = DeviceInfo.getModel();
    const appName = DeviceInfo.getApplicationName();
    const appVersion = DeviceInfo.getVersion();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    const localeLanguage = locale.split('-')[0] || 'en';
    const localeRegion = locale.split('-')[1] || 'US';
    const adId: string | undefined = undefined; // TODO: Implement Ad ID
    const isPushPermissionGranted = await this.getPushPermissionStatus();
    const sdkType = 'react-native';
    const sdkVersion = await ClixVersion.getVersion();
    const pushToken = await this.getPushToken();
    const pushTokenType = pushToken ? 'FCM' : undefined;

    return new ClixDevice({
      id: deviceId,
      platform,
      model,
      manufacturer,
      osName,
      osVersion,
      localeRegion,
      localeLanguage,
      timezone,
      appName,
      appVersion,
      sdkType,
      sdkVersion,
      adId,
      isPushPermissionGranted,
      pushToken,
      pushTokenType,
    });
  }

  async upsertDevice(device: ClixDevice): Promise<void> {
    return this.deviceAPIService.upsertDevice(device);
  }

  async setProjectUserId(projectUserId: string): Promise<void> {
    const deviceId = this.getCurrentDeviceId();
    return this.deviceAPIService.setProjectUserId(deviceId, projectUserId);
  }

  async removeProjectUserId(): Promise<void> {
    const deviceId = this.getCurrentDeviceId();
    return this.deviceAPIService.removeProjectUserId(deviceId);
  }

  async updateUserProperties(properties: Record<string, any>): Promise<void> {
    const deviceId = this.getCurrentDeviceId();
    const userProperties = Object.entries(properties).map(([key, value]) =>
      ClixUserProperty.of(key, value)
    );
    return this.deviceAPIService.upsertUserProperties(deviceId, userProperties);
  }

  async removeUserProperties(names: string[]): Promise<void> {
    const deviceId = this.getCurrentDeviceId();
    return this.deviceAPIService.removeUserProperties(deviceId, names);
  }

  private async getPushPermissionStatus(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      const isGranted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      return isGranted;
    } catch (error) {
      ClixLogger.warn(
        'Failed to get push permission status, defaulting to false',
        error
      );
      return false;
    }
  }

  private async getPushToken(): Promise<string | undefined> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      ClixLogger.warn('Failed to get push token', error);
      return undefined;
    }
  }
}
