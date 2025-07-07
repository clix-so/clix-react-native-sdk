import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { v4 as uuidv4 } from 'uuid';
import { ClixVersion } from '../core/ClixVersion';
import { ClixDevice } from '../models/ClixDevice';
import { ClixUserProperty } from '../models/ClixUserProperty';
import { ClixError } from '../utils/ClixError';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { DeviceAPIService } from './DeviceAPIService';
import { StorageService } from './StorageService';
import { TokenService } from './TokenService';

export class DeviceService {
  private static readonly DEVICE_ID_KEY = 'clix_device_id';

  constructor(
    private readonly storageService: StorageService,
    private readonly tokenService: TokenService,
    private readonly deviceAPIService: DeviceAPIService
  ) {}

  async getCurrentDeviceId(): Promise<string> {
    const existingId = await this.storageService.get<string>(
      DeviceService.DEVICE_ID_KEY
    );
    if (existingId) {
      return existingId;
    }

    const newId = uuidv4();
    await this.storageService.set(DeviceService.DEVICE_ID_KEY, newId);
    return newId;
  }

  async setProjectUserId(projectUserId: string): Promise<void> {
    try {
      const deviceId = await this.getCurrentDeviceId();
      await this.deviceAPIService.setProjectUserId(deviceId, projectUserId);
      ClixLogger.info(`Project user ID set: ${projectUserId}`);
    } catch (error) {
      ClixLogger.error('Failed to set project user ID', error);
      throw ClixError.unknownError({
        reason: `Failed to set project user ID: ${error}`,
        cause: error,
      });
    }
  }

  async removeProjectUserId(): Promise<void> {
    try {
      const deviceId = await this.getCurrentDeviceId();
      await this.deviceAPIService.removeProjectUserId(deviceId);
      ClixLogger.info('Project user ID removed');
    } catch (error) {
      ClixLogger.error('Failed to remove project user ID', error);
      throw ClixError.unknownError({
        reason: `Failed to remove project user ID: ${error}`,
        cause: error,
      });
    }
  }

  async updateUserProperties(properties: Record<string, any>): Promise<void> {
    try {
      const userProperties = Object.entries(properties).map(([key, value]) =>
        ClixUserProperty.of(key, value)
      );

      const deviceId = await this.getCurrentDeviceId();
      await this.deviceAPIService.upsertUserProperties(
        deviceId,
        userProperties
      );

      ClixLogger.info(
        `User properties updated: ${Object.keys(properties).join(', ')}`
      );
    } catch (error) {
      ClixLogger.error('Failed to update user properties', error);
      throw ClixError.unknownError({
        reason: `Failed to update user properties: ${error}`,
        cause: error,
      });
    }
  }

  async removeUserProperties(names: string[]): Promise<void> {
    try {
      const deviceId = await this.getCurrentDeviceId();
      await this.deviceAPIService.removeUserProperties(deviceId, names);

      ClixLogger.info(`User properties removed: ${names.join(', ')}`);
    } catch (error) {
      ClixLogger.error('Failed to remove user properties', error);
      throw ClixError.unknownError({
        reason: `Failed to remove user properties: ${error}`,
        cause: error,
      });
    }
  }

  async upsertToken(token: string, tokenType: string = 'FCM'): Promise<void> {
    try {
      await this.tokenService.saveToken(token);

      const deviceId = await this.getCurrentDeviceId();
      const device = await this.createDevice(deviceId, token);

      await this.deviceAPIService.registerDevice(device);

      ClixLogger.info(`Token upserted: ${tokenType}`);
    } catch (error) {
      ClixLogger.error('Failed to upsert token', error);
      throw ClixError.unknownError({
        reason: `Failed to upsert token: ${error}`,
        cause: error,
      });
    }
  }

  async createDevice(deviceId: string, token?: string): Promise<ClixDevice> {
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
    let adId: string | undefined;
    const isPushPermissionGranted = false;
    const sdkVersion = await ClixVersion.getVersion();

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
      sdkType: 'react-native',
      sdkVersion,
      adId,
      isPushPermissionGranted,
      pushToken: token,
      pushTokenType: token
        ? Platform.OS === 'ios'
          ? 'APNS'
          : 'FCM'
        : undefined,
    });
  }
}
