"use strict";

import messaging from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import { ClixVersion } from "../core/ClixVersion.js";
import { ClixDevice } from "../models/ClixDevice.js";
import { ClixUserProperty } from "../models/ClixUserProperty.js";
import { ClixLogger } from "../utils/logging/ClixLogger.js";
import { UUID } from "../utils/UUID.js";
export class DeviceService {
  deviceIdKey = 'clix_device_id';
  constructor(storageService, tokenService, deviceAPIService) {
    this.storageService = storageService;
    this.tokenService = tokenService;
    this.deviceAPIService = deviceAPIService;
  }
  async initialize() {
    this.currentDevice = await this.createDevice();
    await this.deviceAPIService.upsertDevice(this.currentDevice);
  }
  generateDeviceId() {
    return UUID.generate();
  }
  getCurrentDeviceId() {
    const existingId = this.storageService.get(this.deviceIdKey);
    if (existingId) {
      return existingId;
    }
    const newDeviceId = this.generateDeviceId();
    this.storageService.set(this.deviceIdKey, newDeviceId);
    ClixLogger.debug(`Generated new device ID: ${newDeviceId}`);
    return newDeviceId;
  }
  async createDevice() {
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
    const adId = undefined; // TODO: Implement Ad ID
    const isPushPermissionGranted = await this.getPushPermissionStatus();
    const sdkType = 'react-native';
    const sdkVersion = await ClixVersion.getVersion();
    const pushToken = await this.getPushToken();
    const pushTokenType = pushToken ? 'FCM' : undefined;
    const device = new ClixDevice({
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
      pushTokenType
    });
    return device;
  }
  async upsertDevice(device) {
    return this.deviceAPIService.upsertDevice(device);
  }
  async updatePushToken(pushToken, pushTokenType) {
    if (!this.currentDevice) {
      ClixLogger.warn('Device not initialized yet, cannot update push token');
      return;
    }
    if (this.currentDevice.pushToken === pushToken && this.currentDevice.pushTokenType === pushTokenType) {
      ClixLogger.debug('Push token and type are unchanged, skipping update');
      return;
    }
    const newDevice = this.currentDevice.copyWith({
      pushToken,
      pushTokenType
    });
    this.currentDevice = newDevice;
    return this.deviceAPIService.upsertDevice(newDevice);
  }
  async updatePushPermission(isGranted) {
    if (!this.currentDevice) {
      ClixLogger.warn('Device not initialized yet, cannot update push permission status');
      return;
    }
    if (this.currentDevice.isPushPermissionGranted === isGranted) {
      ClixLogger.debug('Push permission status is unchanged, skipping update');
      return;
    }
    const newDevice = this.currentDevice.copyWith({
      isPushPermissionGranted: isGranted
    });
    this.currentDevice = newDevice;
    return this.deviceAPIService.upsertDevice(newDevice);
  }
  async setProjectUserId(projectUserId) {
    const deviceId = this.getCurrentDeviceId();
    return this.deviceAPIService.setProjectUserId(deviceId, projectUserId);
  }
  async removeProjectUserId() {
    const deviceId = this.getCurrentDeviceId();
    return this.deviceAPIService.removeProjectUserId(deviceId);
  }
  async updateUserProperties(properties) {
    const deviceId = this.getCurrentDeviceId();
    const userProperties = Object.entries(properties).map(([key, value]) => ClixUserProperty.of(key, value));
    return this.deviceAPIService.upsertUserProperties(deviceId, userProperties);
  }
  async removeUserProperties(names) {
    const deviceId = this.getCurrentDeviceId();
    return this.deviceAPIService.removeUserProperties(deviceId, names);
  }
  async getPushPermissionStatus() {
    try {
      const authStatus = await messaging().hasPermission();
      const isGranted = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return isGranted;
    } catch (error) {
      ClixLogger.warn('Failed to get push permission status, defaulting to false', error);
      return false;
    }
  }
  async getPushToken() {
    try {
      const token = await messaging().getToken();
      this.tokenService.saveToken(token);
      return token;
    } catch (error) {
      ClixLogger.warn('Failed to get push token', error);
      return undefined;
    }
  }
}
//# sourceMappingURL=DeviceService.js.map