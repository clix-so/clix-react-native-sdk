import { ClixAPIClient } from '../services/ClixAPIClient';
import { DeviceAPIService } from '../services/DeviceAPIService';
import { DeviceService } from '../services/DeviceService';
import { EventAPIService } from '../services/EventAPIService';
import { EventService } from '../services/EventService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';
import { TokenService } from '../services/TokenService';
import { ClixLogger, ClixLogLevel } from '../utils/logging/ClixLogger';
import type { PickPartial, Prettify } from '../utils/types';
import type { ClixConfig } from './ClixConfig';
import { ClixInitCoordinator } from './ClixInitCoordinator';
import { ClixNotification } from './ClixNotification';

type ClixInitializeOptions = Prettify<
  PickPartial<ClixConfig, 'endpoint' | 'logLevel' | 'extraHeaders'>
>;

export class Clix {
  static shared?: Clix;
  static initCoordinator = new ClixInitCoordinator();

  static Notification = ClixNotification.shared;

  config?: ClixConfig;
  storageService?: StorageService;
  tokenService?: TokenService;
  eventService?: EventService;
  deviceService?: DeviceService;
  notificationService?: NotificationService;

  private static configKey = 'clix_config';

  /**
   * Initialize Clix SDK
   */
  static async initialize(options: ClixInitializeOptions): Promise<void> {
    try {
      const config: ClixConfig = {
        ...options,
        endpoint: options.endpoint || 'https://api.clix.so',
        logLevel: options.logLevel || ClixLogLevel.INFO,
        extraHeaders: options.extraHeaders || {},
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
      this.shared.deviceService = new DeviceService(
        this.shared.storageService,
        this.shared.tokenService,
        deviceApiService
      );
      this.shared.eventService = new EventService(
        eventApiService,
        this.shared.deviceService
      );
      this.shared.notificationService = new NotificationService(
        this.shared.deviceService,
        this.shared.tokenService,
        this.shared.eventService
      );

      this.shared.storageService.set(this.configKey, config);

      const device = await this.shared.deviceService.createDevice();
      await this.shared.deviceService.upsertDevice(device);

      await this.shared.notificationService.initialize();

      ClixLogger.debug('Clix SDK initialized successfully');
      this.initCoordinator.completeInitialization();
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      this.initCoordinator.failInitialization(errorInstance);
    }
  }

  /**
   * Set user ID
   */
  static async setUserId(userId: string): Promise<void> {
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
  static async removeUserId(): Promise<void> {
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
  static async setUserProperty(key: string, value: any): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared?.deviceService?.updateUserProperties({ [key]: value });
    } catch (error) {
      ClixLogger.error(`Failed to set user property: ${error}`);
    }
  }

  /**
   * Set user properties
   */
  static async setUserProperties(
    properties: Record<string, any>
  ): Promise<void> {
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
  static async removeUserProperty(key: string): Promise<void> {
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
  static async removeUserProperties(keys: string[]): Promise<void> {
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
  static async trackEvent(
    name: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
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
  static setLogLevel(level: ClixLogLevel): void {
    ClixLogger.debug(`Setting log level: ${level}`);
    ClixLogger.setLogLevel(level);
  }

  /**
   * Get device ID
   */
  static async getDeviceId(): Promise<string | undefined> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      return this.shared?.deviceService?.getCurrentDeviceId();
    } catch (error) {
      ClixLogger.error(`Failed to get device ID: ${error}`);
      return undefined;
    }
  }
}
