import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { Linking, Platform } from 'react-native';
import type { ClixConfig } from '../core/ClixConfig';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { DeviceService } from './DeviceService';
import { EventService } from './EventService';
import { StorageService } from './StorageService';
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

export class NotificationService {
  private static instance?: NotificationService;

  private eventService?: EventService;
  private storageService?: StorageService;
  private deviceService?: DeviceService;
  private tokenService?: TokenService;

  private isInitialized = false;
  private currentToken?: string;

  // Firebase messaging unsubscribe functions
  private unsubscribeOnMessage?: () => void;
  private unsubscribeOnNotificationOpenedApp?: () => void;
  private unsubscribeOnTokenRefresh?: () => void;

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
    tokenService: TokenService
  ): Promise<void> {
    if (this.isInitialized) return;

    this.eventService = eventService;
    this.storageService = storageService;
    this.deviceService = deviceService;
    this.tokenService = tokenService;

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

      // Handle initial message (app opened from notification)
      await this.handleInitialMessage();

      this.isInitialized = true;
      ClixLogger.info('Notification service initialized successfully');
    } catch (error) {
      ClixLogger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  private async initializePlatformNotifications(): Promise<void> {
    try {
      // Register background message handler
      messaging().setBackgroundMessageHandler(this.handleBackgroundMessage);

      ClixLogger.debug('Platform notification initialization completed');
    } catch (error) {
      ClixLogger.error('Failed to initialize platform notifications', error);
      throw error;
    }
  }

  private setupMessageHandlers(): void {
    try {
      // Handle foreground messages
      this.unsubscribeOnMessage = messaging().onMessage(
        this.handleForegroundMessage
      );

      // Handle notification opened app
      this.unsubscribeOnNotificationOpenedApp =
        messaging().onNotificationOpenedApp(this.handleNotificationOpenedApp);

      ClixLogger.debug('Message handlers setup completed');
    } catch (error) {
      ClixLogger.error('Failed to setup message handlers', error);
    }
  }

  private setupTokenRefreshListener(): void {
    try {
      this.unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
        this.handleTokenRefresh
      );
      ClixLogger.debug('Token refresh listener setup completed');
    } catch (error) {
      ClixLogger.error('Failed to setup token refresh listener', error);
    }
  }

  private handleForegroundMessage = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    try {
      ClixLogger.info(
        `Received foreground message: ${remoteMessage.messageId}`
      );
      ClixLogger.debug(`Message data: ${JSON.stringify(remoteMessage.data)}`);
      ClixLogger.debug(
        `Message notification: title="${remoteMessage.notification?.title}", body="${remoteMessage.notification?.body}"`
      );

      const clixPayload = this.parseClixPayload(remoteMessage.data || {});
      if (clixPayload) {
        ClixLogger.debug(`Parsed Clix payload: ${JSON.stringify(clixPayload)}`);
        await this.trackPushNotificationReceived(clixPayload);
      }
    } catch (error) {
      ClixLogger.error('Failed to handle foreground message', error);
    }
  };

  private handleNotificationOpenedApp = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    try {
      ClixLogger.info(
        `App opened from notification: ${remoteMessage.messageId}`
      );
      await this.handleNotificationTap(remoteMessage.data || {});
    } catch (error) {
      ClixLogger.error('Failed to handle notification opened app', error);
    }
  };

  private handleTokenRefresh = async (token: string): Promise<void> => {
    try {
      ClixLogger.info('FCM token refreshed');
      this.currentToken = token;
      await this.saveAndRegisterToken(token);
    } catch (error) {
      ClixLogger.error('Failed to handle token refresh', error);
    }
  };

  private handleBackgroundMessage = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    try {
      ClixLogger.info(
        `Background message received: ${remoteMessage.messageId}`
      );
      ClixLogger.debug(
        `Background message data: ${JSON.stringify(remoteMessage.data)}`
      );

      const clixPayload = this.parseClixPayload(remoteMessage.data || {});
      if (clixPayload) {
        await this.trackPushNotificationReceivedInBackground(clixPayload);

        // Store background notification data
        await this.storeBackgroundNotificationData(remoteMessage, clixPayload);
      }
    } catch (error) {
      ClixLogger.error('Failed to handle background message', error);
    }
  };

  private async handleInitialMessage(): Promise<void> {
    try {
      // Note: getInitialMessage is available in newer versions of @react-native-firebase/messaging
      // For compatibility, we'll handle this through the app opening handlers instead
      ClixLogger.debug('Initial message handling setup completed');
    } catch (error) {
      ClixLogger.error('Failed to handle initial message', error);
    }
  }

  private async handleNotificationTap(
    data: PushNotificationData
  ): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        await this.trackPushEvent('PUSH_NOTIFICATION_TAPPED', clixPayload);
      }

      // Handle URL navigation
      await this.handleUrlNavigation(data);
    } catch (error) {
      ClixLogger.error('Failed to handle notification tap', error);
    }
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

  parseClixPayload(
    userInfo: PushNotificationData
  ): Record<string, any> | undefined {
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

      return undefined;
    } catch (error) {
      ClixLogger.error('Failed to parse Clix payload', error);
      return undefined;
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

      const authStatus = await messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
        announcement: false,
        carPlay: false,
        criticalAlert: false,
      });

      let status: 'authorized' | 'denied' | 'not-determined' | 'provisional';
      let granted = false;

      switch (authStatus) {
        case messaging.AuthorizationStatus.AUTHORIZED:
          status = 'authorized';
          granted = true;
          break;
        case messaging.AuthorizationStatus.PROVISIONAL:
          status = 'provisional';
          granted = true;
          break;
        case messaging.AuthorizationStatus.DENIED:
          status = 'denied';
          granted = false;
          break;
        default:
          status = 'not-determined';
          granted = false;
      }

      ClixLogger.info(`Notification permission granted: ${granted}`);

      // Store permission status
      await this.storageService?.set('notification_permission_status', status);

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
      await messaging().subscribeToTopic(topic);
      ClixLogger.info(`Subscribed to topic: ${topic}`);
    } catch (error) {
      ClixLogger.error(`Failed to subscribe to topic: ${topic}`, error);
      throw error;
    }
  }

  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      ClixLogger.info(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      ClixLogger.error(`Failed to unsubscribe from topic: ${topic}`, error);
      throw error;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        ClixLogger.info(
          `Badge count set to: ${count} (iOS notification badge management requires manual implementation)`
        );
      } catch (error) {
        ClixLogger.error('Failed to set badge count', error);
      }
    }
  }

  async reset(): Promise<void> {
    try {
      // Unsubscribe from listeners
      this.unsubscribeOnMessage?.();
      this.unsubscribeOnNotificationOpenedApp?.();
      this.unsubscribeOnTokenRefresh?.();

      await this.storageService?.remove('clix_notification_settings');
      await this.storageService?.remove('clix_last_notification');
      await this.storageService?.remove('last_background_notification');

      if (this.tokenService) {
        await this.tokenService.reset();
      }

      this.currentToken = undefined;
      this.isInitialized = false;
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
    } else {
      await this.trackPushEventInBackground(clixPayload, messageId);
    }
  }

  private async trackPushNotificationReceivedInBackground(
    clixPayload: Record<string, any>
  ): Promise<void> {
    const messageId = clixPayload.message_id as string;
    if (!messageId) {
      ClixLogger.warn(
        'No message_id found in payload, skipping event tracking'
      );
      return;
    }

    try {
      await this.trackPushEventInBackground(clixPayload, messageId);
      ClixLogger.info('PUSH_NOTIFICATION_RECEIVED event tracked in background');
    } catch (error) {
      ClixLogger.error('Error tracking event in background', error);
    }
  }

  private async trackPushEventInBackground(
    clixPayload: Record<string, any>,
    messageId: string
  ): Promise<void> {
    try {
      // Import services locally to avoid circular dependencies in background context
      const { StorageService } = await import('./StorageService');
      const { TokenService } = await import('./TokenService');
      const { DeviceService } = await import('./DeviceService');
      const { EventService } = await import('./EventService');
      const { DeviceAPIService } = await import('./DeviceAPIService');
      const { EventAPIService } = await import('./EventAPIService');
      const { ClixAPIClient } = await import('./ClixAPIClient');

      const storageService = StorageService.getInstance();

      const configData = await storageService.get<ClixConfig>('clix_config');
      if (!configData) {
        ClixLogger.error('No Clix config found in storage');
        return;
      }

      const deviceId = await storageService.get<string>('clix_device_id');
      if (!deviceId) {
        ClixLogger.warn(
          'No device ID found in storage, cannot track event in background'
        );
        return;
      }

      const config = configData;
      const properties =
        NotificationService.extractTrackingProperties(clixPayload);

      const apiClient = new ClixAPIClient(config);
      const deviceAPIService = new DeviceAPIService(apiClient);
      const tokenService = new TokenService(storageService);

      const deviceService = new DeviceService(
        storageService,
        tokenService,
        deviceAPIService
      );

      const eventAPIService = new EventAPIService(apiClient);
      const eventService = new EventService(eventAPIService, deviceService);

      await eventService.trackEvent(
        'PUSH_NOTIFICATION_RECEIVED',
        properties,
        messageId
      );

      ClixLogger.info(
        'PUSH_NOTIFICATION_RECEIVED event tracked via EventService in background'
      );
    } catch (error) {
      ClixLogger.error(
        'Error tracking event via EventService in background',
        error
      );
    }
  }

  private async storeBackgroundNotificationData(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    clixPayload?: Record<string, any>
  ): Promise<void> {
    try {
      const notificationData = {
        messageId: remoteMessage.messageId,
        data: remoteMessage.data,
        timestamp: Date.now(),
        clixMessageId: clixPayload?.message_id as string,
        campaignId: clixPayload?.campaign_id as string,
        trackingId: clixPayload?.tracking_id as string,
      };

      const { StorageService } = await import('./StorageService');
      const storageService = StorageService.getInstance();
      await storageService.set(
        'last_background_notification',
        notificationData
      );
    } catch (error) {
      ClixLogger.error('Failed to store background notification data', error);
    }
  }

  private async getOrFetchToken(): Promise<string | undefined> {
    if (this.tokenService) {
      const savedToken = await this.tokenService.getCurrentToken();
      if (savedToken) return savedToken;
    }

    try {
      const token = await messaging().getToken();
      if (token) {
        ClixLogger.info(`Got FCM token: ${token.substring(0, 20)}...`);
        await this.tokenService?.saveToken(token);
      }
      return token;
    } catch (error) {
      ClixLogger.error('Failed to fetch FCM token', error);
      return undefined;
    }
  }

  private async saveAndRegisterToken(token: string): Promise<void> {
    if (this.tokenService) {
      await this.tokenService.saveToken(token);
      ClixLogger.info('New FCM token saved via TokenService');
    }
    await this.registerTokenWithServer(token);
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    if (this.deviceService) {
      await this.deviceService.upsertToken(token, 'FCM');
      ClixLogger.info('FCM token registered with server');
    }
  }
}
