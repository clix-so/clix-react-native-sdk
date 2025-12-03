import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { ClixVersion } from '../core/ClixVersion';
import { ClixDevice } from '../models/ClixDevice';
import { ClixUserProperty } from '../models/ClixUserProperty';
import { ClixError } from '../utils/ClixError';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { UUID } from '../utils/UUID';
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

  getCurrentDeviceId(): string {
    const existingId = this.storageService.get<string>(
      DeviceService.DEVICE_ID_KEY
    );
    if (existingId) {
      return existingId;
    }

    const newId = UUID.generate();
    this.storageService.set(DeviceService.DEVICE_ID_KEY, newId);
    return newId;
  }

  async setProjectUserId(projectUserId: string): Promise<void> {
    try {
      const deviceId = this.getCurrentDeviceId();
      await this.deviceAPIService.setProjectUserId(deviceId, projectUserId);
      ClixLogger.debug(`Project user ID set: ${projectUserId}`);
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
      const deviceId = this.getCurrentDeviceId();
      await this.deviceAPIService.removeProjectUserId(deviceId);
      ClixLogger.debug('Project user ID removed');
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

      const deviceId = this.getCurrentDeviceId();
      await this.deviceAPIService.upsertUserProperties(
        deviceId,
        userProperties
      );

      ClixLogger.debug(
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
      const deviceId = this.getCurrentDeviceId();
      await this.deviceAPIService.removeUserProperties(deviceId, names);

      ClixLogger.debug(`User properties removed: ${names.join(', ')}`);
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
      this.tokenService.saveToken(token);

      const deviceId = this.getCurrentDeviceId();
      const device = await this.createDevice(deviceId, token);

      await this.deviceAPIService.registerDevice(device);

      ClixLogger.debug(`Token upserted: ${tokenType}`);
    } catch (error) {
      ClixLogger.error('Failed to upsert token', error);

      // Don't throw for token upsert failures during initialization
      // This allows the SDK to continue initializing even if token registration fails
      if (
        error instanceof Error &&
        error.message.includes('crypto.getRandomValues')
      ) {
        ClixLogger.warn(
          'Token upsert failed due to crypto polyfill issue, will retry later'
        );
        return;
      }

      throw ClixError.unknownError({
        reason: `Failed to upsert token: ${error}`,
        cause: error,
      });
    }
  }

  async upsertIsPushPermissionGranted(isGranted: boolean): Promise<void> {
    try {
      const deviceId = this.getCurrentDeviceId();
      const currentToken = this.tokenService.getCurrentToken();
      const device = await this.createDevice(deviceId, currentToken, isGranted);

      await this.deviceAPIService.registerDevice(device);
      ClixLogger.debug(
        `Push permission status upserted: ${isGranted ? 'granted' : 'denied'}`
      );
    } catch (error) {
      ClixLogger.error('Failed to upsert push permission status', error);
      throw ClixError.unknownError({
        reason: `Failed to upsert push permission status: ${error}`,
        cause: error,
      });
    }
  }

  private async getPushPermissionStatus(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      const isGranted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      ClixLogger.debug(
        `Push permission status: ${isGranted ? 'granted' : 'denied'}`
      );
      return isGranted;
    } catch (error) {
      ClixLogger.warn(
        'Failed to get push permission status, defaulting to false',
        error
      );
      return false;
    }
  }

  async createDevice(
    deviceId: string,
    token?: string,
    isPushPermissionGranted?: boolean
  ): Promise<ClixDevice> {
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
    const pushPermissionGranted =
      isPushPermissionGranted ?? (await this.getPushPermissionStatus());
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
      isPushPermissionGranted: pushPermissionGranted,
      pushToken: token,
      pushTokenType: token
        ? Platform.OS === 'ios'
          ? 'APNS'
          : 'FCM'
        : undefined,
    });
  }
}
