import { Platform, Linking } from 'react-native';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { EventService } from './EventService';
import { StorageService } from './StorageService';
import { DeviceService } from './DeviceService';
import { TokenService } from './TokenService';

// Types for push notification data
export interface PushNotificationData {
  [key: string]: any;
}

export interface NotificationContent {
  title: string;
  body: string;
  imageUrl?: string;
}

export interface NotificationPermissionStatus {
  status: 'authorized' | 'denied' | 'not-determined' | 'provisional';
  granted: boolean;
}

export type PushReceivedHandler = (data: PushNotificationData) => void;
export type PushTappedHandler = (data: PushNotificationData) => void;

export class NotificationService {
  private static instance: NotificationService | null = null;

  private eventService?: EventService;
  private storageService?: StorageService;
  private deviceService?: DeviceService;
  private tokenService?: TokenService;

  private isInitialized = false;
  private currentToken?: string;

  private onPushReceived?: PushReceivedHandler;
  private onPushTapped?: PushTappedHandler;

  constructor() {
    if (NotificationService.instance) {
      return NotificationService.instance;
    }
    NotificationService.instance = this;
  }

  async initialize(
    eventService: EventService,
    storageService: StorageService,
    deviceService: DeviceService,
    tokenService: TokenService,
    options?: {
      onPushReceived?: PushReceivedHandler;
      onPushTapped?: PushTappedHandler;
    }
  ): Promise<void> {
    if (this.isInitialized) return;

    this.eventService = eventService;
    this.storageService = storageService;
    this.deviceService = deviceService;
    this.tokenService = tokenService;
    this.onPushReceived = options?.onPushReceived;
    this.onPushTapped = options?.onPushTapped;

    try {
      ClixLogger.info('Initializing notification service');

      // Initialize platform-specific notification handling
      await this.initializePlatformNotifications();

      // Request permissions
      const permissionStatus = await this.requestNotificationPermission();
      if (!permissionStatus.granted) {
        ClixLogger.warn(
          'Push notification permission denied. User needs to enable it manually in Settings.'
        );
      }

      // Setup message handlers
      this.setupMessageHandlers();

      // Get and update token if permission granted
      if (permissionStatus.granted) {
        await this.getAndUpdateToken();
        this.setupTokenRefreshListener();
      } else {
        ClixLogger.info('Skipping token setup due to denied permissions');
      }

      this.isInitialized = true;
      ClixLogger.info('Notification service initialized successfully');
    } catch (error) {
      ClixLogger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  private async initializePlatformNotifications(): Promise<void> {
    // In React Native, we rely on native modules or libraries like @react-native-firebase/messaging
    // For now, we'll implement a minimal version that can be extended
    ClixLogger.debug('Platform notification initialization completed');
  }

  private setupMessageHandlers(): void {
    // This would typically integrate with @react-native-firebase/messaging or similar
    // For now, we'll set up basic handlers that can be called from native side
    ClixLogger.debug('Message handlers setup completed');
  }

  private setupTokenRefreshListener(): void {
    // This would listen to token refresh events from the native side
    ClixLogger.debug('Token refresh listener setup completed');
  }

  async getCurrentToken(): Promise<string | undefined> {
    try {
      this.currentToken = await this.getOrFetchToken();
      return this.currentToken;
    } catch (error) {
      ClixLogger.error('Failed to get FCM token', error);
      return undefined;
    }
  }

  private async getAndUpdateToken(): Promise<void> {
    try {
      const token = await this.getCurrentToken();
      if (token) {
        await this.registerTokenWithServer(token);
      }
    } catch (error) {
      ClixLogger.error('Failed to update token', error);
    }
  }

  async handlePushReceived(userInfo: PushNotificationData): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(userInfo);
      if (clixPayload) {
        ClixLogger.debug(`Parsed Clix payload: ${JSON.stringify(clixPayload)}`);
        await this.trackPushNotificationReceived(clixPayload);
      }

      this.onPushReceived?.(userInfo);
    } catch (error) {
      ClixLogger.error('Failed to handle push received', error);
    }
  }

  async handlePushTapped(userInfo: PushNotificationData): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(userInfo);
      if (clixPayload) {
        await this.trackPushEvent('PUSH_NOTIFICATION_TAPPED', clixPayload);
      }

      // Handle URL navigation
      await this.handleUrlNavigation(userInfo);

      this.onPushTapped?.(userInfo);
    } catch (error) {
      ClixLogger.error('Failed to handle push tapped', error);
    }
  }

  parseClixPayload(userInfo: PushNotificationData): Record<string, any> | null {
    try {
      if (userInfo.clix) {
        const clixData = userInfo.clix;
        if (typeof clixData === 'object') {
          return clixData as Record<string, any>;
        }
        if (typeof clixData === 'string') {
          return JSON.parse(clixData) as Record<string, any>;
        }
      }

      // Check for direct Clix keys
      const clixKeys = [
        'message_id',
        'campaign_id',
        'user_id',
        'device_id',
        'tracking_id',
      ];
      if (clixKeys.some((key) => userInfo[key] !== undefined)) {
        return userInfo;
      }

      return null;
    } catch (error) {
      ClixLogger.error('Failed to parse Clix payload', error);
      return null;
    }
  }

  getMessageId(userInfo: PushNotificationData): string | undefined {
    const clixPayload = this.parseClixPayload(userInfo);
    return clixPayload?.message_id as string;
  }

  private async handleUrlNavigation(data: PushNotificationData): Promise<void> {
    try {
      let url: string | undefined;

      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        url = clixPayload.landing_url as string;
      }

      url =
        url ||
        (data.landing_url as string) ||
        (data.url as string) ||
        (data.link as string) ||
        (data.click_action as string) ||
        undefined;

      if (url && url.trim()) {
        ClixLogger.info(`Opening URL from notification: ${url}`);

        try {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            ClixLogger.info(`URL opened successfully: ${url}`);
          } else {
            ClixLogger.warn(`Cannot open URL: ${url}`);
          }
        } catch (error) {
          ClixLogger.error(`Error opening URL: ${url}`, error);
        }
      }
    } catch (error) {
      ClixLogger.error('Failed to handle URL navigation', error);
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermissionStatus> {
    try {
      ClixLogger.info('Requesting notification permission');

      // This would typically call the native notification permission request
      // For now, we'll implement a basic version
      const status = await this.requestPermissions();
      const granted = status === 'authorized';

      ClixLogger.info(`Notification permission granted: ${granted}`);

      return {
        status,
        granted,
      };
    } catch (error) {
      ClixLogger.error('Failed to request notification permission', error);
      return {
        status: 'denied',
        granted: false,
      };
    }
  }

  private async requestPermissions(): Promise<
    'authorized' | 'denied' | 'not-determined' | 'provisional'
  > {
    // This would integrate with platform-specific permission requests
    // For now, return a default status
    return 'authorized';
  }

  async setNotificationPreferences(
    enabled: boolean,
    categories?: string[]
  ): Promise<void> {
    try {
      const settings = {
        enabled,
        categories: categories || [],
        timestamp: Date.now(),
      };

      await this.storageService?.set('clix_notification_settings', settings);
      ClixLogger.info(`Notification preferences saved: enabled=${enabled}`);
    } catch (error) {
      ClixLogger.error('Failed to set notification preferences', error);
    }
  }

  async subscribeToTopic(topic: string): Promise<void> {
    try {
      // This would call the native Firebase messaging method
      ClixLogger.info(`Subscribed to topic: ${topic}`);
    } catch (error) {
      ClixLogger.error(`Failed to subscribe to topic: ${topic}`, error);
      throw error;
    }
  }

  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      // This would call the native Firebase messaging method
      ClixLogger.info(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      ClixLogger.error(`Failed to unsubscribe from topic: ${topic}`, error);
      throw error;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        // This would call the native iOS badge setting method
        ClixLogger.info(`Badge count set to: ${count}`);
      } catch (error) {
        ClixLogger.error('Failed to set badge count', error);
      }
    }
  }

  async reset(): Promise<void> {
    try {
      await this.storageService?.remove('clix_notification_settings');
      await this.storageService?.remove('clix_last_notification');

      if (this.tokenService) {
        await this.tokenService.reset();
      }

      this.currentToken = undefined;
      ClixLogger.info('Notification data reset completed');
    } catch (error) {
      ClixLogger.error('Failed to reset notification data', error);
    }
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  get token(): string | undefined {
    return this.currentToken;
  }

  private static extractTrackingProperties(
    clixPayload?: Record<string, any>
  ): Record<string, any> {
    if (!clixPayload) return {};

    const properties: Record<string, any> = {};

    const fieldMapping = {
      message_id: 'messageId',
      campaign_id: 'campaignId',
      tracking_id: 'trackingId',
    };

    Object.entries(fieldMapping).forEach(([key, value]) => {
      const val = clixPayload[key] as string;
      if (val) {
        properties[value] = val;
      }
    });

    return properties;
  }

  private async trackPushEvent(
    eventType: string,
    clixPayload: Record<string, any>
  ): Promise<void> {
    const properties =
      NotificationService.extractTrackingProperties(clixPayload);
    const messageId = clixPayload.message_id as string;

    await this.eventService?.trackEvent(eventType, properties, messageId);

    ClixLogger.info(`${eventType} tracked: ${messageId}`);
  }

  private async trackPushNotificationReceived(
    clixPayload: Record<string, any>
  ): Promise<void> {
    const messageId = clixPayload.message_id as string;
    if (!messageId) {
      ClixLogger.warn(
        'No message_id found in payload, skipping event tracking'
      );
      return;
    }

    if (this.eventService) {
      await this.trackPushEvent('PUSH_NOTIFICATION_RECEIVED', clixPayload);
    }
  }

  private async getOrFetchToken(): Promise<string | undefined> {
    if (this.tokenService) {
      const savedToken = await this.tokenService.getCurrentToken();
      if (savedToken) return savedToken;
    }

    // This would typically call the native Firebase messaging method to get token
    // For now, we'll return undefined and let it be implemented by the integrating app
    const token = await this.fetchTokenFromNative();
    if (token) {
      ClixLogger.info(`Got FCM token: ${token.substring(0, 20)}...`);
      await this.tokenService?.saveToken(token);
    }
    return token;
  }

  private async fetchTokenFromNative(): Promise<string | undefined> {
    // This would be implemented by calling the native Firebase messaging module
    // For now, return undefined
    return undefined;
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    if (this.deviceService) {
      await this.deviceService.upsertToken(token, 'FCM');
      ClixLogger.info('FCM token registered with server');
    }
  }
}
