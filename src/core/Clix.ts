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
  private static _shared: Clix | null = null;
  private static _isInitializing: boolean = false;
  private static _initPromise: Promise<void> | null = null;

  // Services - nullable until initialization
  private _storageService: StorageService | null = null;
  private _eventService: EventService | null = null;
  private _deviceService: DeviceService | null = null;
  private _notificationService: NotificationService | null = null;

  private constructor() {}

  /**
   * Initialize Clix SDK
   */
  static async initialize(config: ClixConfig): Promise<void> {
    if (this._isInitializing && this._initPromise) {
      await this._initPromise;
      return;
    }

    this._isInitializing = true;
    this._initPromise = this._performInitialization(config);

    try {
      await this._initPromise;
    } finally {
      this._isInitializing = false;
    }
  }

  private static async _performInitialization(
    config: ClixConfig
  ): Promise<void> {
    try {
      ClixLogger.setLogLevel(config.logLevel || ClixLogLevel.Error);
      ClixLogger.info('Initializing Clix SDK');

      const instance = new Clix();
      await instance._setConfig(config);

      this._shared = instance;
      ClixLogger.info('Clix SDK initialized successfully');
    } catch (error) {
      ClixLogger.error('Failed to initialize Clix SDK', error);
      throw error;
    }
  }

  /**
   * Set configuration
   */
  private async _setConfig(config: ClixConfig): Promise<void> {
    // Initialize storage service
    this._storageService = new StorageService();

    // Store configuration
    await this._storageService.set('project_id', config.projectId);
    await this._storageService.set('api_key', config.apiKey);

    // Store full config for background handler
    await this._storageService.set('clix_config', {
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
      logLevel: config.logLevel || ClixLogLevel.Error,
    };

    // Initialize API client
    const apiClient = new ClixAPIClient(configWithDefaults);

    // Initialize API services
    const deviceAPIService = new DeviceAPIService(apiClient);
    const eventAPIService = new EventAPIService(apiClient);

    // Initialize token service
    const tokenService = new TokenService(this._storageService);

    // Initialize device service
    this._deviceService = new DeviceService(
      this._storageService,
      tokenService,
      deviceAPIService
    );

    // Initialize event service
    this._eventService = new EventService(eventAPIService, this._deviceService);

    // Initialize notification service
    this._notificationService = new NotificationService();
    await this._notificationService.initialize(
      this._eventService,
      this._storageService,
      this._deviceService,
      tokenService
    );
  }

  /**
   * Wait for initialization with timeout protection
   */
  private static async _waitForInitialization(): Promise<void> {
    if (this._shared !== null) return;
    if (this._isInitializing && this._initPromise) {
      await this._initPromise;
      return;
    }
    throw ClixError.notInitialized();
  }

  /**
   * Set user ID
   */
  static async setUserId(userId: string): Promise<void> {
    await this._waitForInitialization();
    try {
      await this._shared!._deviceService!.setProjectUserId(userId);
    } catch (error) {
      throw ClixError.unknownErrorWithReason(`Failed to set user ID: ${error}`);
    }
  }

  /**
   * Remove user ID
   */
  static async removeUserId(): Promise<void> {
    await this._waitForInitialization();
    try {
      await this._shared!._deviceService!.removeProjectUserId();
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
    await this._waitForInitialization();
    try {
      await this._shared!._deviceService!.updateUserProperties({
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
    await this._waitForInitialization();
    try {
      await this._shared!._deviceService!.updateUserProperties(userProperties);
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
    await this._waitForInitialization();
    try {
      await this._shared!._deviceService!.removeUserProperties([key]);
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
    await this._waitForInitialization();
    try {
      await this._shared!._deviceService!.removeUserProperties(keys);
    } catch (error) {
      throw ClixError.unknownErrorWithReason(
        `Failed to remove user properties: ${error}`
      );
    }
  }

  /**
   * Get device ID
   */
  static async getDeviceId(): Promise<string | null> {
    await this._waitForInitialization();
    const deviceId = await this._shared!._deviceService!.getCurrentDeviceId();
    return deviceId;
  }

  /**
   * Get push token
   */
  static async getPushToken(): Promise<string | null> {
    await this._waitForInitialization();
    const token = await this._shared!._notificationService!.getCurrentToken();
    return token || null;
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
    return this._shared !== null;
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
    await this._waitForInitialization();
    try {
      await this._shared!._eventService!.trackEvent(
        name,
        options?.properties,
        options?.messageId
      );
    } catch (error) {
      throw ClixError.unknownErrorWithReason(`Failed to track event: ${error}`);
    }
  }
}
