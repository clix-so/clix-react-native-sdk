import { ClixAPIClient } from '../services/ClixAPIClient';
import { DeviceAPIService } from '../services/DeviceAPIService';
import { DeviceService } from '../services/DeviceService';
import { EventAPIService } from '../services/EventAPIService';
import { EventService } from '../services/EventService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';
import { TokenService } from '../services/TokenService';
import { ClixError } from '../utils/ClixError';
import { ClixLogLevel, ClixLogger } from '../utils/logging/ClixLogger';
import type { ClixConfig } from './ClixConfig';

export class Clix {
  private static shared?: Clix;
  private static isInitializing: boolean = false;
  private static initPromise?: Promise<void>;

  private storageService?: StorageService;
  private eventService?: EventService;
  private deviceService?: DeviceService;
  private notificationService?: NotificationService;

  private constructor() {}

  /**
   * Initialize Clix SDK
   */
  static async initialize(config: ClixConfig): Promise<void> {
    if (this.isInitializing && this.initPromise) {
      await this.initPromise;
      return;
    }

    this.isInitializing = true;
    this.initPromise = this.performInitialization(config);

    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private static async performInitialization(
    config: ClixConfig
  ): Promise<void> {
    try {
      ClixLogger.setLogLevel(config.logLevel || ClixLogLevel.ERROR);
      ClixLogger.info('Initializing Clix SDK');

      const instance = new Clix();
      await instance.setConfig(config);

      this.shared = instance;
      ClixLogger.info('Clix SDK initialized successfully');
    } catch (error) {
      ClixLogger.error('Failed to initialize Clix SDK', error);
      throw error;
    }
  }

  /**
   * Set configuration
   */
  private async setConfig(config: ClixConfig): Promise<void> {
    // Initialize storage service
    this.storageService = new StorageService();

    // Store configuration
    await this.storageService.set('project_id', config.projectId);
    await this.storageService.set('api_key', config.apiKey);

    // Store full config for background handler
    await this.storageService.set('clix_config', {
      projectId: config.projectId,
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      logLevel: config.logLevel,
      extraHeaders: config.extraHeaders,
    });

    // Set default values for config
    const configWithDefaults: ClixConfig = {
      ...config,
      endpoint: config.endpoint || 'https://api.clix.so',
      logLevel: config.logLevel || ClixLogLevel.ERROR,
    };

    // Initialize API client
    const apiClient = new ClixAPIClient(configWithDefaults);

    // Initialize API services
    const deviceAPIService = new DeviceAPIService(apiClient);
    const eventAPIService = new EventAPIService(apiClient);

    // Initialize token service
    const tokenService = new TokenService(this.storageService);

    // Initialize device service
    this.deviceService = new DeviceService(
      this.storageService,
      tokenService,
      deviceAPIService
    );

    // Initialize event service
    this.eventService = new EventService(eventAPIService, this.deviceService);

    // Initialize notification service
    this.notificationService = new NotificationService();
    await this.notificationService.initialize(
      this.eventService,
      this.storageService,
      this.deviceService,
      tokenService
    );
  }

  /**
   * Wait for initialization with timeout protection
   */
  private static async waitForInitialization(): Promise<void> {
    if (this.shared) return;

    // If initialization is in progress, wait for it
    if (this.isInitializing && this.initPromise) {
      await this.initPromise;
      return;
    }

    // If initialization hasn't started yet, wait for it to start
    // Use a polling mechanism to avoid freezing the app
    const maxWaitTime = 30000; // 30 seconds timeout
    const pollInterval = 100; // Check every 100ms
    const startTime = Date.now();

    while (!this.shared && !this.isInitializing) {
      if (Date.now() - startTime > maxWaitTime) {
        throw ClixError.unknownErrorWithReason(
          'Initialization timeout: Clix.initialize() was not called within 30 seconds'
        );
      }

      // Wait for a short interval before checking again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // If initialization started while we were waiting, wait for it to complete
    if (this.isInitializing && this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Set user ID
   */
  static async setUserId(userId: string): Promise<void> {
    await this.waitForInitialization();
    try {
      await this.shared!.deviceService!.setProjectUserId(userId);
    } catch (error) {
      throw ClixError.unknownErrorWithReason(`Failed to set user ID: ${error}`);
    }
  }

  /**
   * Remove user ID
   */
  static async removeUserId(): Promise<void> {
    await this.waitForInitialization();
    try {
      await this.shared!.deviceService!.removeProjectUserId();
    } catch (error) {
      throw ClixError.unknownErrorWithReason(
        `Failed to remove user ID: ${error}`
      );
    }
  }

  /**
   * Set user property
   */
  static async setUserProperty(key: string, value: any): Promise<void> {
    await this.waitForInitialization();
    try {
      await this.shared!.deviceService!.updateUserProperties({
        [key]: value,
      });
    } catch (error) {
      throw ClixError.unknownErrorWithReason(
        `Failed to set user property: ${error}`
      );
    }
  }

  /**
   * Set user properties
   */
  static async setUserProperties(
    userProperties: Record<string, any>
  ): Promise<void> {
    await this.waitForInitialization();
    try {
      await this.shared!.deviceService!.updateUserProperties(userProperties);
    } catch (error) {
      throw ClixError.unknownErrorWithReason(
        `Failed to set user properties: ${error}`
      );
    }
  }

  /**
   * Remove user property
   */
  static async removeUserProperty(key: string): Promise<void> {
    await this.waitForInitialization();
    try {
      await this.shared!.deviceService!.removeUserProperties([key]);
    } catch (error) {
      throw ClixError.unknownErrorWithReason(
        `Failed to remove user property: ${error}`
      );
    }
  }

  /**
   * Remove user properties
   */
  static async removeUserProperties(keys: string[]): Promise<void> {
    await this.waitForInitialization();
    try {
      await this.shared!.deviceService!.removeUserProperties(keys);
    } catch (error) {
      throw ClixError.unknownErrorWithReason(
        `Failed to remove user properties: ${error}`
      );
    }
  }

  /**
   * Get device ID
   */
  static async getDeviceId(): Promise<string | undefined> {
    await this.waitForInitialization();
    const deviceId = await this.shared!.deviceService!.getCurrentDeviceId();
    return deviceId;
  }

  /**
   * Get push token
   */
  static async getPushToken(): Promise<string | undefined> {
    await this.waitForInitialization();
    const token = await this.shared!.notificationService!.getCurrentToken();
    return token || undefined;
  }

  /**
   * Set log level
   */
  static setLogLevel(level: ClixLogLevel): void {
    ClixLogger.setLogLevel(level);
  }

  /**
   * Check if SDK is initialized
   */
  static get isInitialized(): boolean {
    return !!this.shared;
  }

  /**
   * Track event
   */
  static async trackEvent(
    name: string,
    options?: {
      properties?: Record<string, any>;
      messageId?: string;
    }
  ): Promise<void> {
    await this.waitForInitialization();
    try {
      await this.shared!.eventService!.trackEvent(
        name,
        options?.properties,
        options?.messageId
      );
    } catch (error) {
      throw ClixError.unknownErrorWithReason(`Failed to track event: ${error}`);
    }
  }

  /**
   * Get notification service
   */
  static getNotificationService(): NotificationService | undefined {
    if (!this.shared) {
      ClixLogger.warn('Clix SDK not initialized');
      return undefined;
    }
    return this.shared.notificationService;
  }
}
