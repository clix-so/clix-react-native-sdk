import { Platform } from 'react-native';
import { ClixVersion } from '../core/ClixVersion';
import { ClixDevice } from '../models/ClixDevice';
import { ClixUserProperty } from '../models/ClixUserProperty';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { ClixError } from '../utils/ClixError';
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

    // Generate UUID v4
    const newId = this.generateUUID();
    await this.storageService.set(DeviceService.DEVICE_ID_KEY, newId);
    return newId;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      const v = c === 'x' ? r : (r % 4) + 8;
      return v.toString(16);
    });
  }

  async setProjectUserId(projectUserId: string): Promise<void> {
    try {
      const deviceId = await this.getCurrentDeviceId();
      await this.deviceAPIService.setProjectUserId(deviceId, projectUserId);
      ClixLogger.info(`Project user ID set: ${projectUserId}`);
    } catch (error) {
      ClixLogger.error('Failed to set project user ID', error);
      throw ClixError.unknownErrorWithReason(
        `Failed to set project user ID: ${error}`
      );
    }
  }

  async removeProjectUserId(): Promise<void> {
    try {
      const deviceId = await this.getCurrentDeviceId();
      await this.deviceAPIService.removeProjectUserId(deviceId);
      ClixLogger.info('Project user ID removed');
    } catch (error) {
      ClixLogger.error('Failed to remove project user ID', error);
      throw ClixError.unknownErrorWithReason(
        `Failed to remove project user ID: ${error}`
      );
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
      throw ClixError.unknownErrorWithReason(
        `Failed to update user properties: ${error}`
      );
    }
  }

  async removeUserProperties(names: string[]): Promise<void> {
    try {
      const deviceId = await this.getCurrentDeviceId();
      await this.deviceAPIService.removeUserProperties(deviceId, names);

      ClixLogger.info(`User properties removed: ${names.join(', ')}`);
    } catch (error) {
      ClixLogger.error('Failed to remove user properties', error);
      throw ClixError.unknownErrorWithReason(
        `Failed to remove user properties: ${error}`
      );
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
      throw ClixError.unknownErrorWithReason(
        `Failed to upsert token: ${error}`
      );
    }
  }

  async createDevice(deviceId: string, token?: string): Promise<ClixDevice> {
    // Use Platform API and reasonable defaults
    const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';
    const osName = Platform.OS === 'ios' ? 'iOS' : 'Android';
    const osVersion = Platform.Version?.toString() || 'Unknown';

    // Set reasonable defaults for device info
    const manufacturer = Platform.OS === 'ios' ? 'Apple' : 'Android';
    const model = Platform.OS === 'ios' ? 'iPhone' : 'Android Device';
    const appName = 'React Native App';
    const appVersion = '1.0.0';

    // Locale and timezone info using JavaScript APIs
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = Intl.DateTimeFormat().resolvedOptions();
    const localeLanguage = locale.locale?.split('-')[0] || 'en';
    const localeRegion = locale.locale?.split('-')[1] || 'US';

    // For push permission, we'll handle this in NotificationService
    // For now, we'll set it to false and update it later
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
      adId: undefined, // We'll handle advertising ID separately if needed
      isPushPermissionGranted,
      pushToken: token,
      pushTokenType: token ? 'FCM' : undefined,
    });
  }
}
