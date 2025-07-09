import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { ClixPushNotificationPayload } from '../models/ClixPushNotificationPayload';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { DeviceService } from './DeviceService';
import { EventService } from './EventService';
import { StorageService } from './StorageService';
import { TokenService } from './TokenService';

export enum PushNotificationEvent {
  RECEIVED = 'PUSH_NOTIFICATION_RECEIVED',
  TAPPED = 'PUSH_NOTIFICATION_TAPPED',
}

export interface NotificationPermissionStatus {
  status: FirebaseMessagingTypes.AuthorizationStatus;
  granted: boolean;
}

export interface NotificationContent {
  title: string;
  body: string;
  imageUrl?: string;
}

export class NotificationService {
  private static readonly STORAGE_KEYS = {
    NOTIFICATION_SETTINGS: 'clix_notification_settings',
    NOTIFICATION_PERMISSION_STATUS: 'notification_permission_status',
    LAST_NOTIFICATION: 'clix_last_notification',
    LAST_BACKGROUND_NOTIFICATION: 'last_background_notification',
    CLIX_CONFIG: 'clix_config',
    DEVICE_ID: 'clix_device_id',
  } as const;

  private static readonly DEFAULT_NOTIFICATION_ICON = 'ic_launcher';
  private static readonly NOTIFICATION_CHANNEL_ID = 'clix_channel';
  private static readonly NOTIFICATION_CHANNEL_NAME = 'Clix Notifications';

  private storageService?: StorageService;
  private deviceService?: DeviceService;
  private tokenService?: TokenService;
  private eventService?: EventService;

  private isInitialized = false;
  private currentToken?: string;

  private backgroundHandler?: void;
  private unsubscribeOnTokenRefresh?: () => void;
  private unsubscribeOnMessage?: () => void;
  private unsubscribeOnMessageOpenedApp?: () => void;

  constructor() {}

  async initialize({
    eventService,
    storageService,
    deviceService,
    tokenService,
  }: {
    eventService: EventService;
    storageService: StorageService;
    deviceService: DeviceService;
    tokenService: TokenService;
  }): Promise<void> {
    if (this.isInitialized) return;

    this.storageService = storageService;
    this.deviceService = deviceService;
    this.tokenService = tokenService;
    this.eventService = eventService;

    try {
      ClixLogger.info('Initializing notification service');

      const permissionStatus = await this.requestPermissions();

      if (!permissionStatus.granted) {
        ClixLogger.warn(
          'Push notification permission denied. User needs to enable it manually in Settings.'
        );
      }

      this.setupForegroundMessageHandlers();

      if (permissionStatus.granted) {
        await this.getAndUpdateToken();
        this.setupTokenRefreshListener();
      } else {
        ClixLogger.info('Skipping token setup due to denied permissions');
      }

      await this.initializeLocalNotifications();

      this.isInitialized = true;
      ClixLogger.info('Notification service initialized successfully');
    } catch (error) {
      ClixLogger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const authStatus = await messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
        announcement: false,
        carPlay: false,
        criticalAlert: false,
      });

      ClixLogger.info(`Notification permission status: ${authStatus}`);

      let status: FirebaseMessagingTypes.AuthorizationStatus;
      let granted = false;

      switch (authStatus) {
        case messaging.AuthorizationStatus.AUTHORIZED:
          status = messaging.AuthorizationStatus.AUTHORIZED;
          granted = true;
          break;
        case messaging.AuthorizationStatus.PROVISIONAL:
          status = messaging.AuthorizationStatus.PROVISIONAL;
          granted = true;
          break;
        case messaging.AuthorizationStatus.DENIED:
          status = messaging.AuthorizationStatus.DENIED;
          granted = false;
          break;
        default:
          status = messaging.AuthorizationStatus.NOT_DETERMINED;
          granted = false;
      }

      await this.storageService?.set(
        NotificationService.STORAGE_KEYS.NOTIFICATION_PERMISSION_STATUS,
        status
      );

      return { status, granted };
    } catch (error) {
      ClixLogger.error('Failed to request permissions', error);
      return { status: messaging.AuthorizationStatus.DENIED, granted: false };
    }
  }

  setupBackgroundMessageHandler(): void {
    if (this.backgroundHandler) {
      return;
    }
    this.backgroundHandler = messaging().setBackgroundMessageHandler(
      async (remoteMessage) => {
        await this.handleBackgroundMessage(remoteMessage);
      }
    );
    ClixLogger.debug('Background message handler setup completed');
  }

  private async handleBackgroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    try {
      ClixLogger.info(
        `Background message received: ${remoteMessage.messageId}`
      );

      const clixPayload = this.parseClixPayloadFromMessage(remoteMessage);
      if (!clixPayload) {
        ClixLogger.warn('No Clix payload found in background message');
        return;
      }

      if (this.storageService) {
        await this.storeBackgroundNotificationData(
          this.storageService,
          remoteMessage,
          clixPayload
        );
      }

      if (!remoteMessage.notification) {
        await this.showLocalNotification(remoteMessage, clixPayload);
      }
    } catch (error) {
      ClixLogger.error('Failed to handle background message', error);
    }
  }

  public convertToRecord(
    clixPayload: ClixPushNotificationPayload
  ): Record<string, any> {
    return {
      message_id: clixPayload.messageId,
      campaign_id: clixPayload.campaignId,
      user_id: clixPayload.userId,
      device_id: clixPayload.deviceId,
      tracking_id: clixPayload.trackingId,
      landing_url: clixPayload.landingUrl,
      image_url: clixPayload.imageUrl,
      custom_properties: clixPayload.customProperties,
    };
  }

  public parseClixPayload(
    userInfo: Record<string, any>
  ): ClixPushNotificationPayload | undefined {
    try {
      let clixData: Record<string, any> | undefined;

      // Check for nested clix data
      if (userInfo.clix) {
        const clixRawData = userInfo.clix;
        if (typeof clixRawData === 'object') {
          clixData = clixRawData as Record<string, any>;
        }
        if (typeof clixRawData === 'string') {
          try {
            clixData = JSON.parse(clixRawData) as Record<string, any>;
          } catch (parseError) {
            ClixLogger.warn('Failed to parse clix string data', parseError);
          }
        }
      }

      // Check for direct Clix keys in userInfo
      if (!clixData) {
        const CLIX_KEYS = [
          'message_id',
          'campaign_id',
          'user_id',
          'device_id',
          'tracking_id',
          'clix_notification_id', // Support Firebase direct format
        ] as const;
        if (CLIX_KEYS.some((key) => userInfo[key] !== undefined)) {
          clixData = userInfo;
        }
      }

      if (clixData && (clixData.message_id || clixData.clix_notification_id)) {
        return new ClixPushNotificationPayload({
          messageId: clixData.message_id || clixData.clix_notification_id || '',
          campaignId: clixData.campaign_id,
          userId: clixData.user_id,
          deviceId: clixData.device_id,
          trackingId: clixData.tracking_id,
          landingUrl: clixData.landing_url || clixData.deep_link,
          imageUrl: clixData.image_url,
          customProperties: clixData.custom_properties || clixData,
        });
      }

      return undefined;
    } catch (error) {
      ClixLogger.error('Failed to parse Clix payload', error);
      return undefined;
    }
  }

  private parseClixPayloadFromMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): ClixPushNotificationPayload | null {
    try {
      const data = remoteMessage.data || {};

      // Use parseClixPayload method
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        return clixPayload;
      }

      // Fallback parsing for direct Firebase message format
      if (!data.clix_notification_id) {
        return null;
      }

      return new ClixPushNotificationPayload({
        messageId:
          typeof data.clix_notification_id === 'string'
            ? data.clix_notification_id
            : '',
        landingUrl:
          typeof data.deep_link === 'string' ? data.deep_link : undefined,
        imageUrl:
          typeof data.image_url === 'string' ? data.image_url : undefined,
        customProperties: data,
      });
    } catch (error) {
      ClixLogger.error('Failed to parse Clix payload from message', error);
      return null;
    }
  }

  async initializeLocalNotifications(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: NotificationService.NOTIFICATION_CHANNEL_ID,
          name: NotificationService.NOTIFICATION_CHANNEL_NAME,
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });
      }

      notifee.onForegroundEvent(({ type, detail }) => {
        switch (type) {
          case EventType.PRESS:
            ClixLogger.info('Notification tapped (foreground)');
            this.handleNotificationTap(detail.notification?.data || {});
            break;
          default:
            ClixLogger.debug(`Notifee foreground event: ${type}`);
        }
      });

      notifee.onBackgroundEvent(async ({ type, detail }) => {
        switch (type) {
          case EventType.PRESS:
            ClixLogger.info('Notification tapped (background)');
            await this.handleNotificationTap(detail.notification?.data || {});
            break;
          default:
            ClixLogger.debug(`Notifee background event: ${type}`);
        }
      });

      ClixLogger.debug('Local notification initialization completed');
    } catch (error) {
      ClixLogger.error('Failed to initialize local notifications', error);
      throw error;
    }
  }

  async showLocalNotification(
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      const notificationContent = {
        title: (clixPayload.customProperties?.title as string) || 'New Message',
        body: (clixPayload.customProperties?.body as string) || '',
        imageUrl: clixPayload.imageUrl,
      };
      ClixLogger.debug(
        `Showing local notification: ${notificationContent.title} - ${notificationContent.body}`
      );

      const imageUrl = notificationContent.imageUrl;

      await notifee.displayNotification({
        id: clixPayload.messageId,
        title: notificationContent.title,
        body: notificationContent.body,
        data: clixPayload.customProperties || {},
        android: {
          channelId: NotificationService.NOTIFICATION_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          smallIcon: NotificationService.DEFAULT_NOTIFICATION_ICON,
          largeIcon: imageUrl,
          style: imageUrl
            ? {
                type: AndroidStyle.BIGPICTURE,
                picture: imageUrl,
              }
            : undefined,
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          attachments: imageUrl
            ? [
                {
                  url: imageUrl,
                },
              ]
            : undefined,
        },
      });

      ClixLogger.info('Local notification displayed successfully', {
        messageId: clixPayload.messageId,
        title: notificationContent.title,
      });
    } catch (error) {
      ClixLogger.error('Failed to show local notification', error);
    }
  }

  private setupForegroundMessageHandlers(): void {
    this.unsubscribeOnMessage = messaging().onMessage(this.onForegroundMessage);
    this.unsubscribeOnMessageOpenedApp = messaging().onNotificationOpenedApp(
      this.onMessageOpenedApp
    );
    this.handleInitialMessage();

    ClixLogger.debug('Foreground message handlers setup completed');
  }

  private async handleForegroundPushNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(remoteMessage.data || {});
      if (!clixPayload) {
        ClixLogger.warn('No Clix payload found in foreground message');
        return;
      }

      await this.trackPushEvent(
        PushNotificationEvent.RECEIVED,
        this.convertToRecord(clixPayload)
      );

      if (!remoteMessage.notification) {
        await this.showLocalNotification(clixPayload);
      }
    } catch (error) {
      ClixLogger.error('Failed to handle foreground push notification', error);
    }
  }

  private onForegroundMessage = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    await this.handleForegroundPushNotification(remoteMessage);
  };

  public async handleNotificationTap(data: Record<string, any>): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        await this.handlePushTapped(data);
      }

      await this.handleUrlNavigation(data);
    } catch (error) {
      ClixLogger.error('Failed to handle notification tap', error);
    }
  }

  private async handlePushTapped(userInfo: Record<string, any>): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(userInfo);
      if (clixPayload) {
        await this.trackPushEvent(
          'PUSH_NOTIFICATION_TAPPED',
          this.convertToRecord(clixPayload)
        );
        ClixLogger.debug('Push notification tapped event tracked', {
          messageId: clixPayload.messageId,
        });
      } else {
        ClixLogger.debug('No Clix payload found for push tap');
      }
    } catch (error) {
      ClixLogger.error('Failed to handle push tapped', error);
    }
  }

  public trackPushEvent(
    eventType: string,
    clixPayload: Record<string, any>
  ): Promise<void> {
    return this._trackPushEvent(eventType, clixPayload);
  }

  private async _trackPushEvent(
    eventType: string,
    clixPayload: Record<string, any>
  ): Promise<void> {
    const properties = this.extractTrackingProperties(clixPayload);
    const messageId = clixPayload.message_id as string;
    await this.eventService?.trackEvent(eventType, properties, messageId);
    ClixLogger.info(`${eventType} tracked: ${messageId}`);
  }

  private extractTrackingProperties(
    clixPayload?: Record<string, any>
  ): Record<string, any> {
    if (!clixPayload) return {};

    const properties: Record<string, any> = {};
    const FIELD_MAPPING = {
      message_id: 'messageId',
      campaign_id: 'campaignId',
      tracking_id: 'trackingId',
    } as const;

    Object.entries(FIELD_MAPPING).forEach(([key, value]) => {
      const val = clixPayload[key] as string;
      if (val) {
        properties[value] = val;
      }
    });

    return properties;
  }

  private async handleUrlNavigation(data: Record<string, any>): Promise<void> {
    try {
      let url: string | undefined;

      // Try to get URL from Clix payload first
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload && clixPayload.landingUrl) {
        url = clixPayload.landingUrl;
      }

      // Fallback to direct data properties
      url =
        url ||
        (data.landing_url as string) ||
        (data.url as string) ||
        (data.link as string) ||
        (data.click_action as string) ||
        (data.deep_link as string);

      if (url && url.trim()) {
        ClixLogger.info(`Opening URL from notification: ${url}`);

        try {
          const canOpen = await Linking.canOpenURL(url);
          ClixLogger.debug(`Can launch URL: ${canOpen}`);

          if (canOpen) {
            await Linking.openURL(url);
            ClixLogger.info(`URL opened successfully: ${url}`);
          } else {
            ClixLogger.warn(`Cannot launch URL: ${url}`);
            try {
              await Linking.openURL(url);
              ClixLogger.info(`URL opened with platform default mode: ${url}`);
            } catch (e) {
              ClixLogger.error(
                'Failed to launch URL with platform default mode',
                e
              );
            }
          }
        } catch (error) {
          ClixLogger.error(`Error parsing or launching URL: ${url}`, error);
        }
      } else {
        ClixLogger.debug('No URL found in notification data');
      }
    } catch (error) {
      ClixLogger.error('Failed to handle URL navigation', error);
    }
  }

  private onMessageOpenedApp = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    try {
      ClixLogger.info(
        `App opened from notification: ${remoteMessage.messageId}`
      );
      await this.handleNotificationTap(remoteMessage.data || {});
    } catch (error) {
      ClixLogger.error('Failed to handle message opened app', error);
    }
  };

  private async handleInitialMessage(): Promise<void> {
    try {
      const initialMessage = await messaging().getInitialNotification();
      if (initialMessage) {
        ClixLogger.info(
          `App launched from notification: ${initialMessage.messageId}`
        );
        await this.handleNotificationTap(initialMessage.data || {});
      }
    } catch (error) {
      ClixLogger.error('Failed to handle initial message', error);
    }
  }

  private setupTokenRefreshListener(): void {
    try {
      this.unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
        this.onTokenRefresh
      );
      ClixLogger.debug('Token refresh listener setup completed');
    } catch (error) {
      ClixLogger.error('Failed to setup token refresh listener', error);
    }
  }

  private onTokenRefresh = async (token: string): Promise<void> => {
    try {
      ClixLogger.info('FCM token refreshed');
      this.currentToken = token;
      await this.saveAndRegisterToken(token);
    } catch (error) {
      ClixLogger.error('Failed to handle token refresh', error);
    }
  };

  async getCurrentToken(): Promise<string | undefined> {
    try {
      const token = await this.getOrFetchToken();
      if (token) {
        ClixLogger.debug('Current token retrieved successfully', {
          tokenLength: token.length,
        });
      } else {
        ClixLogger.warn('No current token available');
      }
      return token;
    } catch (error) {
      ClixLogger.error('Failed to get current token', error);
      return undefined;
    }
  }

  private async getAndUpdateToken(): Promise<void> {
    try {
      const token = await this.getOrFetchToken();
      if (token) {
        this.currentToken = token;
        await this.saveAndRegisterToken(token);
      }
    } catch (error) {
      ClixLogger.error('Failed to get and update token', error);
    }
  }

  async setNotificationPreferences(
    enabled: boolean,
    categories?: string[]
  ): Promise<void> {
    if (!this.storageService) {
      throw new Error('Storage service not initialized');
    }

    try {
      const settings = {
        enabled,
        categories: categories || [],
        updatedAt: Date.now(),
        version: '1.0',
      };

      await this.storageService.set(
        NotificationService.STORAGE_KEYS.NOTIFICATION_SETTINGS,
        settings
      );

      // Update permission status if needed
      if (enabled) {
        const permissionStatus = await this.requestPermissions();
        if (!permissionStatus.granted) {
          ClixLogger.warn(
            'Notification preferences enabled but permission not granted'
          );
        }
      }

      ClixLogger.info('Notification preferences updated successfully', {
        enabled,
        categoriesCount: categories?.length || 0,
      });
    } catch (error) {
      ClixLogger.error('Failed to set notification preferences', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      this.unsubscribeOnTokenRefresh?.();
      this.unsubscribeOnMessage?.();
      this.unsubscribeOnMessageOpenedApp?.();

      this.isInitialized = false;
      this.currentToken = undefined;

      if (this.storageService) {
        await this.storageService.remove(
          NotificationService.STORAGE_KEYS.LAST_NOTIFICATION
        );
        await this.storageService.remove(
          NotificationService.STORAGE_KEYS.LAST_BACKGROUND_NOTIFICATION
        );
        await this.storageService.remove(
          NotificationService.STORAGE_KEYS.NOTIFICATION_PERMISSION_STATUS
        );
      }

      ClixLogger.info('Notification service reset completed successfully');
    } catch (error) {
      ClixLogger.error('Failed to reset notification service', error);
      throw error;
    }
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  get token(): string | undefined {
    return this.currentToken;
  }

  private async getOrFetchToken(): Promise<string | undefined> {
    try {
      if (this.currentToken) {
        return this.currentToken;
      }

      const token = await messaging().getToken();
      if (token) {
        this.currentToken = token;
        return token;
      }

      return undefined;
    } catch (error) {
      ClixLogger.error('Failed to get or fetch token', error);
      return undefined;
    }
  }

  private async saveAndRegisterToken(token: string): Promise<void> {
    try {
      if (!this.tokenService) {
        ClixLogger.warn('Token service not initialized');
        return;
      }

      await this.tokenService.saveToken(token);
      await this.registerTokenWithServer(token);

      ClixLogger.info('Token saved and registered successfully', {
        tokenLength: token.length,
      });
    } catch (error) {
      ClixLogger.error('Failed to save and register token', error);
    }
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      if (!this.deviceService) {
        ClixLogger.warn('Device service not initialized');
        return;
      }

      await this.deviceService.upsertToken(token);

      ClixLogger.info('Token registered with server successfully', {
        tokenLength: token.length,
      });
    } catch (error) {
      ClixLogger.error('Failed to register token with server', error);
    }
  }

  private async storeBackgroundNotificationData(
    storageService: StorageService,
    message: FirebaseMessagingTypes.RemoteMessage,
    clixPayload?: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      const notificationData = {
        messageId: message.messageId,
        data: message.data,
        clixPayload: clixPayload
          ? this.displayService?.convertToRecord(clixPayload)
          : undefined,
        timestamp: Date.now(),
        receivedAt: new Date().toISOString(),
      };

      await storageService.set(
        NotificationService.STORAGE_KEYS.LAST_BACKGROUND_NOTIFICATION,
        notificationData
      );

      ClixLogger.debug('Background notification data stored successfully', {
        messageId: message.messageId,
        hasClixPayload: !!clixPayload,
      });
    } catch (error) {
      ClixLogger.error('Failed to store background notification data', error);
    }
  }
}
