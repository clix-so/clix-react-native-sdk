import { ClixAPIClient } from '../services/ClixAPIClient';
import { DeviceAPIService } from '../services/DeviceAPIService';
import { DeviceService } from '../services/DeviceService';
import { EventAPIService } from '../services/EventAPIService';
import { EventService } from '../services/EventService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';
import { TokenService } from '../services/TokenService';
import { ClixError, ClixErrorCode } from '../utils/ClixError';
import { ClixLogLevel, ClixLogger } from '../utils/logging/ClixLogger';
import type { ClixConfig } from './ClixConfig';

class InitCoordinator {
  private static readonly TIMEOUT_MS = 5000;
  private promise: Promise<void>;
  private resolve!: () => void;
  private reject!: (error: any) => void;
  private timeoutId: ReturnType<typeof setTimeout>;

  constructor(timeoutMs: number = InitCoordinator.TIMEOUT_MS) {
    this.promise = new Promise<void>((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
    this.timeoutId = setTimeout(() => {
      this.reject(ClixError.notInitialized());
    }, timeoutMs);
  }

  async waitForInitialization(): Promise<void> {
    return this.promise;
  }

  completeInitialization(): void {
    clearTimeout(this.timeoutId);
    this.resolve();
  }

  failInitialization(error: any): void {
    clearTimeout(this.timeoutId);
    ClixLogger.warn('Clix initialization failed:', error);
    this.reject(error);
  }
}

export class Clix {
  private static shared?: Clix;
  private static initCoordinator = new InitCoordinator();

  private storageService?: StorageService;
  private eventService?: EventService;
  private deviceService?: DeviceService;
  private notificationService?: NotificationService;

  private constructor() {}

  /**
   * Initialize Clix SDK
   */
  static async initialize(config: ClixConfig): Promise<void> {
    try {
      await this.setConfig(config);
      this.initCoordinator.completeInitialization();
    } catch (error) {
      this.initCoordinator.failInitialization(error);
      throw ClixError.notInitialized({ cause: error });
    }
  }

  private static async setConfig(config: ClixConfig): Promise<void> {
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
   * Set user ID
   */
  static async setUserId(userId: string): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared!.deviceService!.setProjectUserId(userId);
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw ClixError.unknownError({
              reason: `Failed to set user ID: ${error}`,
              cause: error,
            });
        }
      }
      throw error;
    }
  }

  /**
   * Remove user ID
   */
  static async removeUserId(): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared!.deviceService!.removeProjectUserId();
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw ClixError.unknownError({
              reason: `Failed to remove user ID: ${error}`,
              cause: error,
            });
        }
      }
      throw error;
    }
  }

  /**
   * Set user property
   */
  static async setUserProperty(key: string, value: any): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared!.deviceService!.updateUserProperties({
        [key]: value,
      });
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw ClixError.unknownError({
              reason: `Failed to set user property: ${error}`,
              cause: error,
            });
        }
      }
      throw error;
    }
  }

  /**
   * Set user properties
   */
  static async setUserProperties(
    userProperties: Record<string, any>
  ): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared!.deviceService!.updateUserProperties(userProperties);
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw ClixError.unknownError({
              reason: `Failed to set user properties: ${error}`,
              cause: error,
            });
        }
      }
      throw error;
    }
  }

  /**
   * Remove user property
   */
  static async removeUserProperty(key: string): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared!.deviceService!.removeUserProperties([key]);
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw ClixError.unknownError({
              reason: `Failed to remove user property: ${error}`,
              cause: error,
            });
        }
      }
      throw error;
    }
  }

  /**
   * Remove user properties
   */
  static async removeUserProperties(keys: string[]): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared!.deviceService!.removeUserProperties(keys);
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw ClixError.unknownError({
              reason: `Failed to remove user properties: ${error}`,
              cause: error,
            });
        }
      }
      throw error;
    }
  }

  /**
   * Get device ID
   */
  static async getDeviceId(): Promise<string | undefined> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const deviceId = await this.shared!.deviceService!.getCurrentDeviceId();
      return deviceId;
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Get push token
   */
  static async getPushToken(): Promise<string | undefined> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const token = await this.shared!.notificationService!.getCurrentToken();
      return token || undefined;
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Set log level
   */
  static setLogLevel(level: ClixLogLevel): void {
    ClixLogger.setLogLevel(level);
  }

  /**
   * Track event
   */
  protected static async trackEvent(
    name: string,
    options?: {
      properties?: Record<string, any>;
      messageId?: string;
    }
  ): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      await this.shared!.eventService!.trackEvent(
        name,
        options?.properties,
        options?.messageId
      );
    } catch (error) {
      if (error instanceof ClixError) {
        switch (error.code) {
          case ClixErrorCode.NOT_INITIALIZED:
            ClixLogger.warn('Clix SDK initialization failed: ' + error.message);
            return;
          default:
            throw ClixError.unknownError({
              reason: `Failed to track event: ${error}`,
              cause: error,
            });
        }
      }
      throw error;
    }
  }
}
