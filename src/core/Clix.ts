import { ClixAPIClient } from '../services/ClixAPIClient';
import { DeviceAPIService } from '../services/DeviceAPIService';
import { DeviceService } from '../services/DeviceService';
import { EventAPIService } from '../services/EventAPIService';
import { EventService } from '../services/EventService';
import { LiveActivityAPIService } from '../services/LiveActivityAPIService';
import { LiveActivityService } from '../services/LiveActivityService';
import { NotificationService } from '../services/NotificationService';
import { SessionService } from '../services/SessionService';
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
  sessionService?: SessionService;
  notificationService?: NotificationService;
  liveActivityService?: LiveActivityService;

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
      const liveActivityApiService = new LiveActivityAPIService(apiClient);

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
      this.shared.sessionService = new SessionService(
        this.shared.storageService,
        this.shared.eventService,
        config.sessionTimeoutMs ?? 30000
      );
      this.shared.notificationService = new NotificationService(
        this.shared.deviceService,
        this.shared.tokenService,
        this.shared.eventService,
        this.shared.sessionService
      );
      this.shared.liveActivityService = new LiveActivityService(
        this.shared.deviceService,
        liveActivityApiService
      );

      this.shared.storageService.set(this.configKey, config);
      this.shared.liveActivityService.initialize();
      await this.shared.notificationService.initialize(); // NOTE(nyanxyz): must be initialized before any await calls
      await this.shared.sessionService.start();
      await this.shared.deviceService.initialize();

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
   * @deprecated Use reset() instead
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
   * Resets all local SDK state including device ID.
   *
   * After calling this method, you must call initialize() again before using the SDK.
   * Use this when a user logs out and you want to start fresh with a new device identity.
   */
  static async reset(): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      this.shared?.sessionService?.cleanup();
      this.shared?.liveActivityService?.cleanup();
      this.shared?.notificationService?.cleanup();
      this.shared?.storageService?.remove('clix_device_id');
      this.shared?.storageService?.remove('clix_session_last_activity');
      this.shared = undefined;
      this.initCoordinator.reset();
    } catch (error) {
      ClixLogger.error(`Failed to reset: ${error}`);
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
