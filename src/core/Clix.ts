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
import { ClixInitCoordinator } from './ClixInitCoordinator';

export class Clix {
  private static shared?: Clix;
  private static initCoordinator = new ClixInitCoordinator();

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
      if (this.initCoordinator.isInitializationFailed()) {
        this.initCoordinator.reset();
      }

      ClixLogger.setLogLevel(config.logLevel || ClixLogLevel.ERROR);
      ClixLogger.info('Initializing Clix SDK');

      this.shared = new Clix();
      await this.shared.setConfig(config);

      ClixLogger.info('Clix SDK initialized successfully');
      this.initCoordinator.completeInitialization();
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      this.initCoordinator.failInitialization(errorInstance);
      throw ClixError.notInitialized({ cause: errorInstance });
    }
  }

  /**
   * Set configuration
   */
  private async setConfig(config: ClixConfig): Promise<void> {
    this.storageService = new StorageService();

    try {
      await this.storageService.set('project_id', config.projectId);
      await this.storageService.set('api_key', config.apiKey);
      await this.storageService.set('clix_config', {
        projectId: config.projectId,
        apiKey: config.apiKey,
        endpoint: config.endpoint,
        logLevel: config.logLevel,
        extraHeaders: config.extraHeaders,
      });
    } catch (error) {
      ClixLogger.warn(
        'Failed to store configuration in storage, continuing with in-memory config',
        error
      );
    }

    const apiClient = new ClixAPIClient({
      ...config,
      endpoint: config.endpoint || 'https://api.clix.so',
      logLevel: config.logLevel || ClixLogLevel.ERROR,
    });

    const deviceAPIService = new DeviceAPIService(apiClient);
    const eventAPIService = new EventAPIService(apiClient);
    const tokenService = new TokenService(this.storageService);
    this.deviceService = new DeviceService(
      this.storageService,
      tokenService,
      deviceAPIService
    );
    this.eventService = new EventService(eventAPIService, this.deviceService);
    this.notificationService = new NotificationService();
    try {
      await this.notificationService.initialize(
        this.eventService,
        this.storageService,
        this.deviceService,
        tokenService
      );
    } catch (error) {
      ClixLogger.warn(
        'Failed to fully initialize notification service, some features may be limited',
        error
      );
    }
  }

  /**
   * Set user ID
   */
  static async setUserId(userId: string): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      if (this.shared?.deviceService) {
        await this.shared.deviceService.setProjectUserId(userId);
      }
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
      if (this.shared?.deviceService) {
        await this.shared.deviceService.removeProjectUserId();
      }
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
      if (this.shared?.deviceService) {
        await this.shared.deviceService.updateUserProperties({
          [key]: value,
        });
      }
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
      if (this.shared?.deviceService) {
        await this.shared.deviceService.updateUserProperties(userProperties);
      }
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
      if (this.shared?.deviceService) {
        await this.shared.deviceService.removeUserProperties([key]);
      }
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
      if (this.shared?.deviceService) {
        await this.shared.deviceService.removeUserProperties(keys);
      }
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
      if (this.shared?.deviceService) {
        const deviceId = await this.shared.deviceService.getCurrentDeviceId();
        return deviceId;
      }
      return undefined;
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
      if (this.shared?.notificationService) {
        const token = await this.shared.notificationService.getCurrentToken();
        return token || undefined;
      }
      return undefined;
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
   * Debug push notification setup - 푸시 알림 설정 디버깅
   */
  static async debugPushNotifications(): Promise<void> {
    try {
      ClixLogger.info('🔍 Starting push notification debug...');
      await Clix.initCoordinator.waitForInitialization();
      
      if (this.shared?.notificationService) {
        ClixLogger.info('📱 NotificationService available, running debug...');
        await this.shared.notificationService.debugPushReceive();
        
        // 테스트 알림도 표시
        await this.shared.notificationService.testNotificationDisplay();
      } else {
        ClixLogger.error('❌ NotificationService not available for debugging');
      }
    } catch (error) {
      ClixLogger.error('Failed to debug push notifications:', error);
    }
  }

  /**
   * Force refresh push notification handlers - 푸시 알림 핸들러 강제 새로고침
   */
  static async refreshPushHandlers(): Promise<void> {
    try {
      ClixLogger.info('🔄 Refreshing push notification handlers...');
      await Clix.initCoordinator.waitForInitialization();
      
      if (this.shared?.notificationService) {
        await this.shared.notificationService.forceRefreshHandlers();
        ClixLogger.info('✅ Push handlers refreshed successfully');
      } else {
        ClixLogger.error('❌ NotificationService not available for refresh');
      }
    } catch (error) {
      ClixLogger.error('Failed to refresh push handlers:', error);
    }
  }

  /**
   * Check global FCM status - 전역 FCM 상태 확인
   */
  static async checkFCMStatus(): Promise<void> {
    try {
      await NotificationService.checkGlobalFCMStatus();
    } catch (error) {
      ClixLogger.error('Failed to check FCM status:', error);
    }
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
      if (this.shared?.eventService) {
        await this.shared.eventService.trackEvent(
          name,
          options?.properties,
          options?.messageId
        );
      }
    } catch (error) {
      ClixLogger.error(`Failed to track event: ${error}`);
    }
  }
}
