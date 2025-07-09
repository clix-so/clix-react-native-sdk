import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
  type Notification as NotifeeNotification,
} from '@notifee/react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { Linking, Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import type { ClixConfig } from '../core/ClixConfig';
import { ClixPushNotificationPayload } from '../models/ClixPushNotificationPayload';
import { ClixLogger } from '../utils/logging/ClixLogger';
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
  private static readonly CHANNEL_ID = 'clix_channel';
  private static readonly CHANNEL_NAME = 'Clix Notifications';

  private firebaseMessaging = messaging();
  private isInitialized = false;
  private currentToken: string | null = null;

  private eventService!: EventService;
  private storageService!: StorageService;
  private deviceService?: DeviceService;
  private tokenService?: TokenService;

  private unsubscribeForegroundMessage?: () => void;
  private unsubscribeNotificationOpened?: () => void;
  private unsubscribeTokenRefresh?: () => void;

  async initialize(
    eventService: EventService,
    storageService: StorageService,
    deviceService?: DeviceService,
    tokenService?: TokenService
  ): Promise<void> {
    if (this.isInitialized) return;
    try {
      ClixLogger.info('Initializing notification service');
      this.eventService = eventService;
      this.storageService = storageService;
      this.deviceService = deviceService;
      this.tokenService = tokenService;
      await this.initializeNotifications();
      this.registerBackgroundHandler();
      this.setupMessageHandlers();
      const settings = await this.requestPermission();
      if (settings !== messaging.AuthorizationStatus.DENIED) {
        await this.getAndUpdateToken();
        this.setupTokenRefreshListener();
      } else {
        ClixLogger.warn('Push notification permission denied');
      }
      this.isInitialized = true;
      ClixLogger.info('Notification service initialized successfully');
    } catch (error) {
      ClixLogger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  private async initializeNotifications(): Promise<void> {
    await notifee.requestPermission({ alert: true, badge: true, sound: true });
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: NotificationService.CHANNEL_ID,
        name: NotificationService.CHANNEL_NAME,
        description: 'Notifications from Clix',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        lights: true,
      });
    }
    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data) {
        await this.handleNotificationTap(detail.notification.data ?? {});
      }
    });
  }

  private registerBackgroundHandler(): void {
    this.firebaseMessaging.setBackgroundMessageHandler(
      async (remoteMessage) => {
        try {
          ClixLogger.info(
            'Background message received:',
            remoteMessage.messageId
          );
          const clixPayload = this.parseClixPayload(remoteMessage.data ?? {});
          if (!clixPayload) return;
          await this.handleBackgroundMessage(remoteMessage, clixPayload);
        } catch (error) {
          ClixLogger.error('Background message handler error:', error);
        }
      }
    );
  }

  private async handleBackgroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    const storageService = new StorageService();
    await storageService.set('last_background_notification', {
      messageId: remoteMessage.messageId,
      data: remoteMessage.data ?? {},
      timestamp: Date.now(),
      clixMessageId: clixPayload.messageId,
      campaignId: clixPayload.campaignId,
      trackingId: clixPayload.trackingId,
    });
    await this.trackEventInBackground(clixPayload);
    if (!remoteMessage.notification) {
      await this.showBackgroundNotification(remoteMessage, clixPayload);
    }
  }

  private setupMessageHandlers(): void {
    this.unsubscribeForegroundMessage = this.firebaseMessaging.onMessage(
      async (remoteMessage) => {
        await this.onForegroundMessage(remoteMessage);
      }
    );
    this.unsubscribeNotificationOpened =
      this.firebaseMessaging.onNotificationOpenedApp(async (remoteMessage) => {
        await this.handleNotificationTap(remoteMessage.data ?? {});
      });
    this.checkInitialNotification();
  }

  private async checkInitialNotification(): Promise<void> {
    try {
      const initialNotification =
        await this.firebaseMessaging.getInitialNotification();
      if (initialNotification) {
        ClixLogger.info(
          'App launched from notification:',
          initialNotification.messageId
        );
        await this.handleNotificationTap(initialNotification.data ?? {});
      }
    } catch (error) {
      ClixLogger.error('Failed to handle initial notification', error);
    }
  }

  private async requestPermission(): Promise<FirebaseMessagingTypes.AuthorizationStatus> {
    const settings = await this.firebaseMessaging.requestPermission({
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
    });
    ClixLogger.info('Notification permission status:', settings);
    await this.storageService.set(
      'notification_permission_status',
      settings.toString()
    );
    return settings;
  }

  private setupTokenRefreshListener(): void {
    this.unsubscribeTokenRefresh = this.firebaseMessaging.onTokenRefresh(
      async (token) => {
        try {
          ClixLogger.info('FCM token refreshed');
          this.currentToken = token;
          await this.saveAndRegisterToken(token);
        } catch (error) {
          ClixLogger.error('Failed to handle token refresh', error);
        }
      }
    );
  }

  private async onForegroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    try {
      ClixLogger.info('Received foreground message:', remoteMessage.messageId);
      ClixLogger.debug('Message data:', remoteMessage.data);
      const clixPayload = this.parseClixPayload(remoteMessage.data ?? {});
      if (clixPayload) {
        ClixLogger.debug('Parsed Clix payload:', clixPayload);
        await this.handlePushReceived(remoteMessage.data ?? {});
        await this.showForegroundNotification(remoteMessage, clixPayload);
      } else {
        ClixLogger.warn('No Clix payload found in message');
      }
    } catch (error) {
      ClixLogger.error('Failed to handle foreground message', error);
    }
  }

  private async handlePushReceived(data: Record<string, any>): Promise<void> {
    try {
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        await this.trackPushEvent('PUSH_NOTIFICATION_RECEIVED', clixPayload);
      }
      ClixLogger.info('Push notification received and processed');
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
      ClixLogger.info('Push notification tapped and processed');
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
        ClixLogger.info('Opening URL from notification:', url);
        try {
          const supported = await Linking.canOpenURL(url);
          ClixLogger.debug('Can open URL:', supported);
          if (supported) {
            await Linking.openURL(url);
            ClixLogger.info('URL opened successfully:', url);
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

  async getCurrentToken(): Promise<string | null> {
    try {
      this.currentToken = await this.getOrFetchToken();
      return this.currentToken;
    } catch (error) {
      ClixLogger.error('Failed to get FCM token', error);
      return null;
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

  private async getOrFetchToken(): Promise<string | null> {
    if (this.tokenService) {
      const savedToken = await this.tokenService.getCurrentToken();
      if (savedToken) return savedToken;
    }
    const token = await this.firebaseMessaging.getToken();
    if (token) {
      ClixLogger.info('Got FCM token:', token.substring(0, 20) + '...');
      await this.tokenService?.saveToken(token);
    }
    return token;
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
      await this.deviceService.upsertToken(token);
      ClixLogger.info('FCM token registered with server');
    }
  }

  private parseClixPayload(
    userInfo: Record<string, any>
  ): ClixPushNotificationPayload | null {
    try {
      // clix 오브젝트 또는 snake_case를 camelCase로 변환
      let payload: any = userInfo;
      if (userInfo.clix) {
        if (typeof userInfo.clix === 'object') {
          payload = userInfo.clix;
        } else if (typeof userInfo.clix === 'string') {
          payload = JSON.parse(userInfo.clix);
        }
      }
      // snake_case → camelCase 변환
      const toCamel = (s: string) =>
        s.replace(/_([a-z])/g, (g) => (g[1] ?? '').toUpperCase());
      const result: any = {};
      if (!payload) return null;
      for (const key in payload) {
        result[toCamel(key)] = payload[key];
      }
      if (!result.messageId) return null;
      return new ClixPushNotificationPayload(result);
    } catch (error) {
      ClixLogger.error('Failed to parse Clix payload', error);
      return null;
    }
  }

  getMessageId(userInfo: Record<string, any>): string | undefined {
    const clixPayload = this.parseClixPayload(userInfo);
    return clixPayload?.messageId;
  }

  private async showForegroundNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      const notificationContent = this.extractNotificationContent(
        remoteMessage.notification,
        clixPayload
      );
      ClixLogger.debug(
        `Showing foreground notification: ${notificationContent.title} - ${notificationContent.body}`
      );
      const notificationConfig: NotifeeNotification = {
        id: remoteMessage.messageId || Date.now().toString(),
        title: notificationContent.title,
        body: notificationContent.body,
        data: remoteMessage.data ?? {},
        android: {
          channelId: NotificationService.CHANNEL_ID,
          pressAction: {
            id: 'default',
          },
        },
      };
      if (notificationContent.imageUrl) {
        if (Platform.OS === 'ios') {
          notificationConfig.ios = {
            attachments: [{ url: notificationContent.imageUrl }],
          };
        } else {
          notificationConfig.android!.style = {
            type: AndroidStyle.BIGPICTURE,
            picture: notificationContent.imageUrl,
          };
        }
      }
      await notifee.displayNotification(notificationConfig);
      ClixLogger.info('Foreground notification displayed successfully');
    } catch (error) {
      ClixLogger.error('Failed to show foreground notification', error);
    }
  }

  private async showBackgroundNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      const notificationContent = this.extractNotificationContent(
        null,
        clixPayload
      );
      await notifee.displayNotification({
        id: remoteMessage.messageId || Date.now().toString(),
        title: notificationContent.title,
        body: notificationContent.body,
        data: remoteMessage.data ?? {},
        android: {
          channelId: NotificationService.CHANNEL_ID,
          pressAction: {
            id: 'default',
          },
          style: notificationContent.imageUrl
            ? {
                type: AndroidStyle.BIGPICTURE,
                picture: notificationContent.imageUrl,
              }
            : undefined,
        },
        ios: notificationContent.imageUrl
          ? {
              attachments: [{ url: notificationContent.imageUrl }],
            }
          : undefined,
      });
      ClixLogger.info(
        'Background notification shown:',
        notificationContent.title
      );
    } catch (error) {
      ClixLogger.error('Failed to show background notification', error);
    }
  }

  private extractNotificationContent(
    fcmNotification: FirebaseMessagingTypes.Notification | null | undefined,
    clixPayload: ClixPushNotificationPayload
  ): NotificationContent {
    const title =
      fcmNotification?.title ||
      clixPayload.customProperties?.title ||
      'New Message';
    const body =
      fcmNotification?.body || clixPayload.customProperties?.body || '';
    const imageUrl = clixPayload.imageUrl;
    return {
      title,
      body,
      imageUrl,
    };
  }

  private async trackPushEvent(
    eventType: string,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    const properties = this.extractTrackingProperties(clixPayload);
    const messageId = clixPayload.messageId;
    await this.eventService.trackEvent(eventType, properties, messageId);
    ClixLogger.info(`${eventType} tracked:`, messageId);
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
        deviceId = uuidv4();
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
      ClixLogger.info('PUSH_NOTIFICATION_RECEIVED event tracked in background');
    } catch (error) {
      ClixLogger.error('Error tracking event in background', error);
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    try {
      ClixLogger.info('Requesting notification permission');
      const settings = await this.requestPermission();
      const granted = settings === messaging.AuthorizationStatus.AUTHORIZED;
      ClixLogger.info('Notification permission granted:', granted);
      return granted;
    } catch (error) {
      ClixLogger.error('Failed to request notification permission', error);
      return false;
    }
  }

  async setNotificationPreferences(preferences: {
    enabled: boolean;
    categories?: string[];
  }): Promise<void> {
    try {
      const settings = {
        enabled: preferences.enabled,
        categories: preferences.categories || [],
        timestamp: Date.now(),
      };
      await this.storageService.set('clix_notification_settings', settings);
      ClixLogger.info('Notification preferences saved:', settings.enabled);
    } catch (error) {
      ClixLogger.error('Failed to set notification preferences', error);
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        await notifee.setBadgeCount(count);
        ClixLogger.info('Badge count set to:', count);
      } catch (error) {
        ClixLogger.error('Failed to set badge count', error);
      }
    }
  }

  async reset(): Promise<void> {
    try {
      await this.storageService.remove('clix_notification_settings');
      await this.storageService.remove('clix_last_notification');
      if (this.tokenService) {
        await this.tokenService.reset();
      }
      this.currentToken = null;
      ClixLogger.info('Notification data reset completed');
    } catch (error) {
      ClixLogger.error('Failed to reset notification data', error);
    }
  }

  cleanup(): void {
    this.unsubscribeForegroundMessage?.();
    this.unsubscribeNotificationOpened?.();
    this.unsubscribeTokenRefresh?.();
    this.isInitialized = false;
    ClixLogger.info('Notification service cleaned up');
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  get token(): string | null {
    return this.currentToken;
  }
}
