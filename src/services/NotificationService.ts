import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
  type AndroidChannel,
  type Event,
} from '@notifee/react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { Linking, Platform } from 'react-native';
import type { ClixConfig } from '../core/ClixConfig';
import { ClixPushNotificationPayload } from '../models/ClixPushNotificationPayload';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { UUID } from '../utils/UUID';
import { ClixAPIClient } from './ClixAPIClient';
import { DeviceAPIService } from './DeviceAPIService';
import { DeviceService } from './DeviceService';
import { EventAPIService } from './EventAPIService';
import { EventService } from './EventService';
import { StorageService } from './StorageService';
import { TokenService } from './TokenService';

interface NotificationContent {
  title: string;
  body: string;
  imageUrl?: string;
}

export class NotificationService {
  private static instance: NotificationService | null = null;

  private static readonly DEFAULT_CHANNEL: AndroidChannel = {
    id: 'clix_default',
    name: 'Clix Notifications',
    description: 'Default notifications from Clix',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    lights: true,
  };

  private messagingService = messaging();
  private isInitialized = false;
  private currentPushToken: string | null = null;
  private processedMessageIds = new Set<string>();

  private eventService!: EventService;
  private storageService!: StorageService;
  private deviceService?: DeviceService;
  private tokenService?: TokenService;

  private unsubscribeForegroundMessage?: () => void;
  private unsubscribeNotificationOpened?: () => void;
  private unsubscribeTokenRefresh?: () => void;
  private unsubscribeNotificationEvents?: () => void;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public static resetInstance(): void {
    if (NotificationService.instance) {
      NotificationService.instance.cleanup();
      NotificationService.instance = null;
    }
  }

  async initialize(
    eventService: EventService,
    storageService: StorageService,
    deviceService?: DeviceService,
    tokenService?: TokenService
  ): Promise<NotificationService> {
    if (this.isInitialized) {
      ClixLogger.debug(
        'Notification service already initialized, returning existing instance'
      );
      return this;
    }

    try {
      ClixLogger.debug('Initializing notification service');

      this.eventService = eventService;
      this.storageService = storageService;
      this.deviceService = deviceService;
      this.tokenService = tokenService;

      await this.initializeNotificationDisplayService();
      await this.initializeMessageService();

      this.isInitialized = true;
      ClixLogger.debug('Notification service initialized successfully');
      return this;
    } catch (error) {
      ClixLogger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  async getCurrentToken(): Promise<string | null> {
    try {
      this.currentPushToken = await this.getOrFetchToken();
      return this.currentPushToken;
    } catch (error) {
      ClixLogger.error('Failed to get push token', error);
      return null;
    }
  }

  cleanup(): void {
    this.unsubscribeForegroundMessage?.();
    this.unsubscribeNotificationOpened?.();
    this.unsubscribeTokenRefresh?.();
    this.unsubscribeNotificationEvents?.();
    this.isInitialized = false;
    this.processedMessageIds.clear();
    ClixLogger.debug('Notification service cleaned up');
  }

  private async initializeNotificationDisplayService(): Promise<void> {
    await notifee.requestPermission({
      alert: true,
      badge: true,
      sound: true,
      criticalAlert: false,
      announcement: false,
      carPlay: false,
      provisional: false,
    });
    if (Platform.OS === 'android') {
      await this.createNotificationChannels();
    }
    this.setupNotificationEventListeners();
  }

  private async createNotificationChannels(): Promise<void> {
    try {
      await notifee.createChannel(NotificationService.DEFAULT_CHANNEL);
      ClixLogger.debug('Notification channels created successfully');
    } catch (error) {
      ClixLogger.error('Failed to create notification channels', error);
    }
  }

  private setupNotificationEventListeners(): void {
    this.unsubscribeNotificationEvents = notifee.onForegroundEvent(
      async (event: Event) => {
        await this.handleNotificationEvent(event);
      }
    );
  }

  private async handleNotificationEvent(event: Event): Promise<void> {
    const { type, detail } = event;

    switch (type) {
      case EventType.PRESS:
        if (detail.notification?.data) {
          await this.handleNotificationTap(detail.notification.data);
        }
        break;
      case EventType.ACTION_PRESS:
        if (detail.pressAction?.id) {
          await this.handleActionPress(
            detail.pressAction.id,
            detail.notification?.data
          );
        }
        break;
      case EventType.DISMISSED:
        ClixLogger.debug('Notification dismissed');
        break;
      default:
        ClixLogger.debug('Unhandled notification event type:', type);
    }
  }

  private async handleActionPress(
    actionId: string,
    data?: Record<string, any>
  ): Promise<void> {
    ClixLogger.debug('Action pressed:', actionId);
    if (data) {
      await this.handleNotificationTap(data);
    }
  }

  private async initializeMessageService(): Promise<void> {
    this.setupMessageHandlers();
    const settings = await this.requestMessagePermission();
    if (settings !== messaging.AuthorizationStatus.DENIED) {
      await this.getAndUpdateToken();
      this.setupTokenRefreshListener();
    } else {
      ClixLogger.warn('Push notification permission denied');
    }
  }

  private setupMessageHandlers(): void {
    this.messagingService.setBackgroundMessageHandler(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        await this.handleBackgroundMessage(remoteMessage);
      }
    );
    this.unsubscribeForegroundMessage = this.messagingService.onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        await this.handleForegroundMessage(remoteMessage);
      }
    );
    this.unsubscribeNotificationOpened =
      this.messagingService.onNotificationOpenedApp(
        async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          await this.handleNotificationTap(remoteMessage.data ?? {});
        }
      );
    this.checkInitialNotification();
  }

  private async handleBackgroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(remoteMessage.data ?? {});
      if (!clixPayload) {
        ClixLogger.warn('No Clix payload found in background message');
        return;
      }

      await this.storageService.set('last_background_notification', {
        messageId: remoteMessage.messageId,
        data: remoteMessage.data ?? {},
        timestamp: Date.now(),
        clixMessageId: clixPayload.messageId,
        campaignId: clixPayload.campaignId,
        trackingId: clixPayload.trackingId,
      });

      await this.trackEventInBackground(clixPayload);

      if (!remoteMessage.notification) {
        await this.displayNotification(remoteMessage, clixPayload);
      }
    } catch (error) {
      ClixLogger.error('Background message handler error:', error);
    }
  }

  private async handleForegroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    try {
      const messageId = remoteMessage.messageId;
      if (!messageId) {
        ClixLogger.warn('No messageId found in foreground message');
        return;
      }

      if (this.processedMessageIds.has(messageId)) {
        ClixLogger.debug(
          'Message already processed, skipping duplicate:',
          messageId
        );
        return;
      }

      const clixPayload = this.parseClixPayload(remoteMessage.data ?? {});
      if (clixPayload) {
        ClixLogger.debug('Parsed Clix payload:', clixPayload);
        this.processedMessageIds.add(messageId);
        await this.handlePushReceived(remoteMessage.data ?? {});
        await this.displayNotification(remoteMessage, clixPayload);
      } else {
        ClixLogger.warn('No Clix payload found in foreground message');
      }
    } catch (error) {
      ClixLogger.error('Failed to handle foreground message', error);
    }
  }

  private async requestMessagePermission(): Promise<any> {
    const settings = await this.messagingService.requestPermission({
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
    });
    ClixLogger.debug('Push notification permission status:', settings);
    await this.storageService.set(
      'notification_permission_status',
      settings.toString()
    );
    return settings;
  }

  private setupTokenRefreshListener(): void {
    this.unsubscribeTokenRefresh = this.messagingService.onTokenRefresh(
      async (token: string) => {
        try {
          ClixLogger.debug('Push token refreshed');
          this.currentPushToken = token;
          await this.saveAndRegisterToken(token);
        } catch (error) {
          ClixLogger.error('Failed to handle token refresh', error);
        }
      }
    );
  }

  private async checkInitialNotification(): Promise<void> {
    try {
      const initialNotification =
        await this.messagingService.getInitialNotification();
      if (initialNotification) {
        ClixLogger.debug(
          'App launched from notification:',
          initialNotification.messageId
        );
        await this.handleNotificationTap(initialNotification.data ?? {});
      }
    } catch (error) {
      ClixLogger.error('Failed to handle initial notification', error);
    }
  }

  private async getAndUpdateToken(): Promise<void> {
    try {
      const token = await this.getCurrentToken();
      if (token) {
        await this.registerTokenWithServer(token);
      }
    } catch (error) {
      ClixLogger.error('Failed to update push token', error);
    }
  }

  private async getOrFetchToken(): Promise<string | null> {
    if (this.tokenService) {
      const savedToken = await this.tokenService.getCurrentToken();
      if (savedToken) return savedToken;
    }
    const token = await this.messagingService.getToken();
    if (token) {
      ClixLogger.debug('Got push token:', token.substring(0, 20) + '...');
      await this.tokenService?.saveToken(token);
    }
    return token;
  }

  private async saveAndRegisterToken(token: string): Promise<void> {
    if (this.tokenService) {
      await this.tokenService.saveToken(token);
      ClixLogger.debug('New push token saved via TokenService');
    }
    await this.registerTokenWithServer(token);
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    if (this.deviceService) {
      await this.deviceService.upsertToken(token);
      ClixLogger.debug('Push token registered with server');
    }
  }

  private async displayNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      const notificationContent = this.extractNotificationContent(
        remoteMessage.notification,
        clixPayload
      );

      ClixLogger.debug('Creating notification config with content:', {
        title: notificationContent.title,
        body: notificationContent.body,
        hasImage: !!notificationContent.imageUrl,
        imageUrl: notificationContent.imageUrl,
      });

      const notificationConfig = await this.createNotificationConfig(
        remoteMessage,
        clixPayload,
        notificationContent,
        NotificationService.DEFAULT_CHANNEL.id
      );

      await notifee.displayNotification(notificationConfig);
      ClixLogger.debug(
        'Notification displayed successfully:',
        notificationContent.title
      );
    } catch (error) {
      ClixLogger.error('Failed to display notification', error);
      if (error instanceof Error) {
        ClixLogger.error('Error details:', {
          message: error.message,
          stack: error.stack,
          messageId: remoteMessage.messageId,
          hasImage: !!clixPayload.imageUrl,
          imageUrl: clixPayload.imageUrl,
        });
      }
    }
  }

  private async createNotificationConfig(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    clixPayload: ClixPushNotificationPayload,
    notificationContent: NotificationContent,
    channelId: string
  ) {
    const config: any = {
      id: remoteMessage.messageId || Date.now().toString(),
      title: notificationContent.title,
      body: notificationContent.body,
      data: remoteMessage.data ?? {},
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
        actions: this.createNotificationActions(clixPayload),
      },
      ios: {
        foregroundPresentationOptions: {
          badge: true,
          sound: true,
          banner: true,
          list: true,
        },
      },
    };

    if (notificationContent.imageUrl) {
      if (this.isValidImageUrl(notificationContent.imageUrl)) {
        ClixLogger.debug(
          'Adding image attachment to notification:',
          notificationContent.imageUrl
        );
        if (Platform.OS === 'ios') {
          try {
            config.ios.attachments = [
              {
                url: notificationContent.imageUrl,
              },
            ];
          } catch (error) {
            ClixLogger.warn('Failed to download image attachment:', error);
          }
        } else {
          config.android.style = {
            type: AndroidStyle.BIGPICTURE,
            picture: notificationContent.imageUrl,
          };
        }
      } else {
        ClixLogger.warn(
          'Skipping attachment due to invalid URL:',
          notificationContent.imageUrl
        );
      }
    }
    return config;
  }

  private createNotificationActions(clixPayload: ClixPushNotificationPayload) {
    const actions = [];

    actions.push({
      title: 'Open',
      pressAction: {
        id: 'default',
      },
    });

    if (clixPayload.customProperties?.actions) {
      const customActions = clixPayload.customProperties.actions;
      if (Array.isArray(customActions)) {
        customActions.forEach((action) => {
          if (action.title && action.actionId) {
            actions.push({
              title: action.title,
              pressAction: {
                id: action.actionId,
              },
            });
          }
        });
      }
    }

    return actions;
  }

  private isValidImageUrl(url: string): boolean {
    return url.trim() !== '' && url.startsWith('http');
  }

  private extractNotificationContent(
    fcmNotification: FirebaseMessagingTypes.Notification | null | undefined,
    clixPayload: ClixPushNotificationPayload
  ): NotificationContent {
    ClixLogger.debug('Extracting notification content from payload:', {
      fcmTitle: fcmNotification?.title,
      fcmBody: fcmNotification?.body,
      customProperties: clixPayload.customProperties,
      messageId: clixPayload.messageId,
      imageUrl: clixPayload.imageUrl,
    });

    const title =
      fcmNotification?.title ||
      clixPayload.customProperties?.title ||
      'New Message';
    const body =
      fcmNotification?.body || clixPayload.customProperties?.body || '';

    ClixLogger.debug('Extracted notification content:', { title, body });

    // Validate imageUrl before using it
    let imageUrl: string | undefined;
    if (clixPayload.imageUrl) {
      ClixLogger.debug('Processing image URL:', clixPayload.imageUrl);
      if (this.isValidImageUrl(clixPayload.imageUrl)) {
        imageUrl = clixPayload.imageUrl;
        ClixLogger.debug('Image URL validated successfully');
      } else {
        ClixLogger.warn('Invalid image URL, skipping:', clixPayload.imageUrl);
      }
    }

    return {
      title,
      body,
      imageUrl,
    };
  }

  private async handlePushReceived(data: Record<string, any>): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        await this.trackPushEvent('PUSH_NOTIFICATION_RECEIVED', clixPayload);
      }
      ClixLogger.debug('Push notification received and processed');
    } catch (error) {
      ClixLogger.error('Failed to handle push received', error);
    }
  }

  private async handlePushTapped(data: Record<string, any>): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        await this.trackPushEvent('PUSH_NOTIFICATION_TAPPED', clixPayload);
      }
      await this.handleUrlNavigation(data);
      ClixLogger.debug('Push notification tapped and processed');
    } catch (error) {
      ClixLogger.error('Failed to handle push tapped', error);
    }
  }

  private async handleNotificationTap(
    data: Record<string, any>
  ): Promise<void> {
    try {
      await this.handlePushTapped(data);
    } catch (error) {
      ClixLogger.error('Failed to handle notification tap', error);
    }
  }

  private async handleUrlNavigation(data: Record<string, any>): Promise<void> {
    try {
      let url: string | undefined;
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        url = clixPayload.landingUrl;
      }
      url =
        url || data.landing_url || data.url || data.link || data.click_action;
      if (url) {
        ClixLogger.debug('Opening URL from notification:', url);
        try {
          const supported = await Linking.canOpenURL(url);
          ClixLogger.debug('Can open URL:', supported);
          if (supported) {
            await Linking.openURL(url);
            ClixLogger.debug('URL opened successfully:', url);
          } else {
            ClixLogger.warn('Cannot open URL:', url);
            await Linking.openURL(url);
          }
        } catch (error) {
          ClixLogger.error('Error opening URL:', error);
        }
      }
    } catch (error) {
      ClixLogger.error('Failed to handle URL navigation', error);
    }
  }

  private parseClixPayload(
    userInfo: Record<string, any>
  ): ClixPushNotificationPayload | null {
    try {
      let payload: any = userInfo;
      if (userInfo.clix) {
        if (typeof userInfo.clix === 'object') {
          payload = userInfo.clix;
        } else if (typeof userInfo.clix === 'string') {
          payload = JSON.parse(userInfo.clix);
        }
      }
      const toCamel = (s: string) =>
        s.replace(/_([a-z])/g, (g) => (g[1] ?? '').toUpperCase());
      const result: any = {};
      if (!payload) return null;
      for (const key in payload) {
        result[toCamel(key)] = payload[key];
      }

      ClixLogger.debug('Parsed Clix payload result:', result);

      if (!result.messageId) return null;

      // Extract title and body into customProperties if they exist
      const customProperties: Record<string, any> = {};
      if (result.title) customProperties.title = result.title;
      if (result.body) customProperties.body = result.body;

      const finalResult = {
        ...result,
        customProperties:
          Object.keys(customProperties).length > 0
            ? customProperties
            : undefined,
      };

      ClixLogger.debug('Final Clix payload result:', finalResult);

      return new ClixPushNotificationPayload(finalResult);
    } catch (error) {
      ClixLogger.error('Failed to parse Clix payload', error);
      return null;
    }
  }

  private async trackPushEvent(
    eventType: string,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    const properties = this.extractTrackingProperties(clixPayload);
    const messageId = clixPayload.messageId;
    await this.eventService.trackEvent(eventType, properties, messageId);
    ClixLogger.debug(`${eventType} tracked:`, messageId);
  }

  private extractTrackingProperties(
    clixPayload: ClixPushNotificationPayload
  ): Record<string, any> {
    const properties: Record<string, any> = {};
    if (clixPayload.messageId) properties.messageId = clixPayload.messageId;
    if (clixPayload.campaignId) properties.campaignId = clixPayload.campaignId;
    if (clixPayload.trackingId) properties.trackingId = clixPayload.trackingId;
    return properties;
  }

  private async trackEventInBackground(
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    const messageId = clixPayload.messageId;
    if (!messageId) {
      ClixLogger.warn('No messageId found in payload, skipping event tracking');
      return;
    }
    try {
      const storageService = new StorageService();
      const configData = await storageService.get<Record<string, any>>(
        'clix_config'
      );
      if (!configData) {
        ClixLogger.error('No Clix config found in storage');
        return;
      }
      let deviceId = await storageService.get<string>('clix_device_id');
      if (!deviceId) {
        ClixLogger.warn(
          'No device ID found in storage, generating new device ID'
        );
        deviceId = UUID.generate();
        await storageService.set('clix_device_id', deviceId);
      }
      const config = configData as ClixConfig;
      const apiClient = new ClixAPIClient(config);
      const deviceAPIService = new DeviceAPIService(apiClient);
      const eventAPIService = new EventAPIService(apiClient);
      const tokenService = new TokenService(storageService);
      const deviceService = new DeviceService(
        storageService,
        tokenService,
        deviceAPIService
      );
      const eventService = new EventService(eventAPIService, deviceService);
      const properties = this.extractTrackingProperties(clixPayload);
      await eventService.trackEvent(
        'PUSH_NOTIFICATION_RECEIVED',
        properties,
        messageId
      );
      ClixLogger.debug(
        'PUSH_NOTIFICATION_RECEIVED event tracked in background'
      );
    } catch (error) {
      ClixLogger.error('Error tracking event in background', error);
    }
  }
}
