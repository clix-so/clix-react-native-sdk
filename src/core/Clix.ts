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

  protected storageService?: StorageService;
  protected eventService?: EventService;
  protected deviceService?: DeviceService;
  protected notificationService?: NotificationService;

  private constructor() {}

  /**
   * Initialize Clix SDK
   */
  static async initialize(config: ClixConfig): Promise<void> {
    try {
      ClixLogger.setLogLevel(config.logLevel || ClixLogLevel.ERROR);
      ClixLogger.info('Initializing Clix SDK');

      this.shared = new Clix();
      await this.shared.setConfig(config);

      ClixLogger.info('Clix SDK initialized successfully');
      this.initCoordinator.completeInitialization();
    } catch (error) {
      this.initCoordinator.failInitialization(error);
      throw ClixError.notInitialized({ cause: error });
    }
  }

  /**
   * Set configuration
   */
  private async setConfig(config: ClixConfig): Promise<void> {
    // Initialize storage service
    this.storageService = StorageService.getInstance();

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

    // Initialize API client
    const apiClient = new ClixAPIClient({
      ...config,
      endpoint: config.endpoint || 'https://api.clix.so',
      logLevel: config.logLevel || ClixLogLevel.ERROR,
    });

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
      ClixLogger.error(`Failed to set user ID: ${error}`);
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
      ClixLogger.error(`Failed to remove user ID: ${error}`);
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
      ClixLogger.error(`Failed to set user property: ${error}`);
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
      ClixLogger.error(`Failed to set user properties: ${error}`);
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
      ClixLogger.error(`Failed to remove user property: ${error}`);
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
      ClixLogger.error(`Failed to remove user properties: ${error}`);
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
      ClixLogger.error(`Failed to get device ID: ${error}`);
      return undefined;
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
      ClixLogger.error(`Failed to get push token: ${error}`);
      return undefined;
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
      ClixLogger.error(`Failed to track event: ${error}`);
    }
  }
}
