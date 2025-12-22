"use strict";

import { ClixAPIClient } from "../services/ClixAPIClient.js";
import { DeviceAPIService } from "../services/DeviceAPIService.js";
import { DeviceService } from "../services/DeviceService.js";
import { EventAPIService } from "../services/EventAPIService.js";
import { EventService } from "../services/EventService.js";
import { NotificationService } from "../services/NotificationService.js";
import { StorageService } from "../services/StorageService.js";
import { TokenService } from "../services/TokenService.js";
import { ClixLogger, ClixLogLevel } from "../utils/logging/ClixLogger.js";
import { ClixInitCoordinator } from "./ClixInitCoordinator.js";
import { ClixNotification } from "./ClixNotification.js";
export class Clix {
  static initCoordinator = new ClixInitCoordinator();
  static Notification = ClixNotification.shared;
  static configKey = 'clix_config';

  /**
   * Initialize Clix SDK
   */
  static async initialize(options) {
    try {
      const config = {
        ...options,
        endpoint: options.endpoint || 'https://api.clix.so',
        logLevel: options.logLevel || ClixLogLevel.INFO,
        extraHeaders: options.extraHeaders || {}
      };
      ClixLogger.setLogLevel(config.logLevel || ClixLogLevel.ERROR);
      ClixLogger.debug('Initializing Clix SDK...');
      this.shared = new Clix();
      this.shared.config = config;
      const apiClient = new ClixAPIClient(config);
      const deviceApiService = new DeviceAPIService(apiClient);
      const eventApiService = new EventAPIService(apiClient);
      this.shared.storageService = new StorageService(config.projectId);
      this.shared.tokenService = new TokenService(this.shared.storageService);
      this.shared.deviceService = new DeviceService(this.shared.storageService, this.shared.tokenService, deviceApiService);
      this.shared.eventService = new EventService(eventApiService, this.shared.deviceService);
      this.shared.notificationService = new NotificationService(this.shared.deviceService, this.shared.tokenService, this.shared.eventService);
      this.shared.storageService.set(this.configKey, config);
      await this.shared.notificationService.initialize(); // NOTE(nyanxyz): must be initialized before any await calls
      await this.shared.deviceService.initialize();
      ClixLogger.debug('Clix SDK initialized successfully');
      this.initCoordinator.completeInitialization();
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      this.initCoordinator.failInitialization(errorInstance);
    }
  }

  /**
   * Set user ID
   */
  static async setUserId(userId) {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared?.deviceService?.setProjectUserId(userId);
    } catch (error) {
      ClixLogger.error(`Failed to set user ID: ${error}`);
    }
  }

  /**
   * Remove user ID
   */
  static async removeUserId() {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared?.deviceService?.removeProjectUserId();
    } catch (error) {
      ClixLogger.error(`Failed to remove user ID: ${error}`);
    }
  }

  /**
   * Set user property
   */
  static async setUserProperty(key, value) {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared?.deviceService?.updateUserProperties({
        [key]: value
      });
    } catch (error) {
      ClixLogger.error(`Failed to set user property: ${error}`);
    }
  }

  /**
   * Set user properties
   */
  static async setUserProperties(properties) {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared?.deviceService?.updateUserProperties(properties);
    } catch (error) {
      ClixLogger.error(`Failed to set user properties: ${error}`);
    }
  }

  /**
   * Remove user property
   */
  static async removeUserProperty(key) {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared?.deviceService?.removeUserProperties([key]);
    } catch (error) {
      ClixLogger.error(`Failed to remove user property: ${error}`);
    }
  }

  /**
   * Remove user properties
   */
  static async removeUserProperties(keys) {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared?.deviceService?.removeUserProperties(keys);
    } catch (error) {
      ClixLogger.error(`Failed to remove user properties: ${error}`);
    }
  }

  /**
   * Track event
   */
  static async trackEvent(name, properties = {}) {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared?.eventService?.trackEvent(name, properties);
    } catch (error) {
      ClixLogger.error(`Failed to track event: ${error}`);
    }
  }

  /**
   * Set log level
   */
  static setLogLevel(level) {
    ClixLogger.debug(`Setting log level: ${level}`);
    ClixLogger.setLogLevel(level);
  }

  /**
   * Get device ID
   */
  static async getDeviceId() {
    try {
      await Clix.initCoordinator.waitForInitialization();
      return this.shared?.deviceService?.getCurrentDeviceId();
    } catch (error) {
      ClixLogger.error(`Failed to get device ID: ${error}`);
      return undefined;
    }
  }
}
//# sourceMappingURL=Clix.js.map