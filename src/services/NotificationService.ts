import notifee, {
  AndroidCategory,
  AndroidGroupAlertBehavior,
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  AuthorizationStatus,
  EventType,
  type AndroidChannel,
  type Event,
  type Notification,
  type NotificationSettings,
} from '@notifee/react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { Linking, Platform } from 'react-native';
import type { ClixPushNotificationPayload } from '../models/ClixPushNotificationPayload';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { DeviceService } from './DeviceService';
import { EventService } from './EventService';
import { SessionService } from './SessionService';
import { TokenService } from './TokenService';

type NotificationData = Record<string, any>;

export type MessageHandler = (
  data: NotificationData
) => Promise<boolean> | boolean;
export type BackgroundMessageHandler = (
  data: NotificationData
) => Promise<void> | void;
export type NotificationOpenedAppHandler = (
  data: NotificationData
) => Promise<void> | void;
export type TokenRefreshHandler = (token: string) => Promise<void> | void;
export type ForegroundEventHandler = (event: Event) => Promise<void> | void;
export type BackgroundEventHandler = (event: Event) => Promise<void> | void;

export class NotificationService {
  autoHandleLandingUrl = true;
  messageHandler?: MessageHandler;
  backgroundMessageHandler?: BackgroundMessageHandler;
  notificationOpenedAppHandler?: NotificationOpenedAppHandler;
  tokenRefreshHandler?: TokenRefreshHandler;
  foregroundEventHandler?: ForegroundEventHandler;
  backgroundEventHandler?: BackgroundEventHandler;

  private isInitialized = false;
  private processedMessageIds = new Set<string>();
  private unsubscribeMessage?: () => void;
  private unsubscribeNotificationOpenedApp?: () => void;
  private unsubscribeTokenRefresh?: () => void;
  private unsubscribeForegroundEvent?: () => void;

  private static readonly DEFAULT_CHANNEL: AndroidChannel = {
    id: 'clix_channel',
    name: 'Clix Notifications',
    description: 'Default notifications from Clix',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    lights: true,
  };
  private static readonly ANDROID_GROUP_ID = 'clix_notification_group';

  constructor(
    private readonly deviceService: DeviceService,
    private readonly tokenService: TokenService,
    private readonly eventService: EventService,
    private readonly sessionService?: SessionService
  ) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      ClixLogger.debug('Notification service already initialized');
      return;
    }

    try {
      ClixLogger.debug('Initializing notification service...');

      this.setupTokenRefreshListener();
      this.setupPushReceivedHandler(); // NOTE(nyanxyz): must be set up before any await calls
      await this.setupPushTappedHandler();

      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      }

      this.isInitialized = true;
      ClixLogger.debug('Notification service initialized successfully');
    } catch (error) {
      ClixLogger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  cleanup(): void {
    this.unsubscribeMessage?.();
    this.unsubscribeNotificationOpenedApp?.();
    this.unsubscribeTokenRefresh?.();
    this.unsubscribeForegroundEvent?.();
    this.isInitialized = false;
    this.processedMessageIds.clear();
    ClixLogger.debug('Notification service cleaned up');
  }

  async requestPermission(): Promise<NotificationSettings> {
    const settings = await notifee.requestPermission({
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
    });
    ClixLogger.debug('Push notification permission status:', settings);

    const isGranted =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    await this.setPermissionGranted(isGranted);
    return settings;
  }

  async setPermissionGranted(isGranted: boolean): Promise<void> {
    try {
      await this.deviceService.updatePushPermission(isGranted);
      ClixLogger.debug(
        `Push permission status reported to server: ${
          isGranted ? 'granted' : 'denied'
        }`
      );
    } catch (error) {
      ClixLogger.warn('Failed to upsert push permission status', error);
    }
  }

  private setupPushReceivedHandler(): void {
    /**
     * Android: background message handler
     */
    messaging().setBackgroundMessageHandler(
      this.handleBackgroundMessage.bind(this)
    );
    /**
     * iOS & Android: foreground message handler
     */
    this.unsubscribeMessage = messaging().onMessage(
      this.handleForegroundMessage.bind(this)
    );
    /**
     * iOS: background messages are handled in the Notification Service Extension
     */
  }

  private async setupPushTappedHandler(): Promise<void> {
    /**
     * Android: background notification tap handler
     *          & app launched from quit state via a notification
     */
    notifee.onBackgroundEvent(
      this.handleBackgroundNotificationEvent.bind(this)
    );
    /**
     * iOS & Android: foreground notification tap handler
     */
    this.unsubscribeForegroundEvent = notifee.onForegroundEvent(
      this.handleForegroundNotificationEvent.bind(this)
    );
    /**
     * iOS: background notification tap handler
     */
    this.unsubscribeNotificationOpenedApp = messaging().onNotificationOpenedApp(
      this.handleNotificationOpenedApp.bind(this)
    );
    /**
     * iOS: app launched from a quit state via a notification
     */
    await this.handleInitialNotification();
  }

  private setupTokenRefreshListener(): void {
    this.unsubscribeTokenRefresh = messaging().onTokenRefresh(
      async (token: string) => {
        try {
          await this.tokenRefreshHandler?.(token);
        } catch (error) {
          ClixLogger.error('Token refresh handler failed', error);
        }

        try {
          ClixLogger.debug(`Push token refreshed: ${token}`);
          this.tokenService.saveToken(token);
          await this.deviceService.updatePushToken(token, 'FCM');
        } catch (error) {
          ClixLogger.error('Failed to handle token refresh', error);
        }
      }
    );
  }

  private async createNotificationChannels(): Promise<void> {
    try {
      await notifee.createChannel(NotificationService.DEFAULT_CHANNEL);
      ClixLogger.debug('Notification channels created successfully');
    } catch (error) {
      ClixLogger.error('Failed to create notification channels', error);
    }
  }

  /**
   * Android: background message handler
   */
  private async handleBackgroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    ClixLogger.debug('Handling background message:', remoteMessage.messageId);

    const data = remoteMessage.data ?? {};
    try {
      await this.backgroundMessageHandler?.(data);
    } catch (error) {
      ClixLogger.warn('Background message handler failed', error);
    }

    try {
      const clixPayload = this.parseClixPayload(data);
      if (!clixPayload) {
        ClixLogger.warn('No Clix payload found in background message');
        return;
      }

      if (!remoteMessage.notification) {
        await this.displayNotification(remoteMessage, clixPayload);
      }

      await this.trackPushReceivedEvent(clixPayload);
    } catch (error) {
      ClixLogger.error('Background message handler error:', error);
    }
  }

  /**
   * iOS & Android: foreground message handler
   */
  private async handleForegroundMessage(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    ClixLogger.debug('Handling foreground message:', remoteMessage.messageId);

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

    const data = remoteMessage.data ?? {};
    try {
      const result = await this.messageHandler?.(data);
      if (result === false) {
        ClixLogger.debug(
          'Foreground message suppressed by user handler:',
          remoteMessage.messageId
        );
        return;
      }
    } catch (error) {
      ClixLogger.error('Foreground message handler failed', error);
    }

    try {
      const clixPayload = this.parseClixPayload(data);
      if (!clixPayload) {
        ClixLogger.warn('No Clix payload found in background message');
        return;
      }

      this.processedMessageIds.add(messageId);

      await this.displayNotification(remoteMessage, clixPayload);

      if (Platform.OS === 'android') {
        // NOTE(nyanxyz): on iOS, Received event is tracked in Notification Service Extension
        await this.trackPushReceivedEvent(clixPayload);
      }
    } catch (error) {
      ClixLogger.error('Failed to handle foreground message', error);
    }
  }

  /**
   * iOS: background notification tap handler
   */
  private async handleNotificationOpenedApp(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    ClixLogger.debug('Handling notification opened from background:', {
      messageId: remoteMessage.messageId,
      data: remoteMessage.data,
    });

    const data = remoteMessage.data ?? {};
    try {
      await this.notificationOpenedAppHandler?.(data);
    } catch (error) {
      ClixLogger.error('Notification opened app handler failed', error);
    }

    try {
      const clixPayload = this.parseClixPayload(data);
      if (clixPayload) {
        await this.trackPushTappedEvent(clixPayload);
      }
      if (this.autoHandleLandingUrl) {
        await this.handleUrlNavigation(data);
      }
    } catch (error) {
      ClixLogger.error(
        'Failed to handle notification opened from background',
        error
      );
    }
  }

  /**
   * iOS: app launched from a quit state via a notification
   */
  private async handleInitialNotification(): Promise<void> {
    try {
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        ClixLogger.debug(
          'App launched from notification:',
          initialNotification.messageId
        );

        const data = initialNotification.data ?? {};
        const clixPayload = this.parseClixPayload(data);
        if (clixPayload) {
          await this.trackPushTappedEvent(clixPayload);
        }
        if (this.autoHandleLandingUrl) {
          await this.handleUrlNavigation(data);
        }
      }
    } catch (error) {
      ClixLogger.error('Failed to handle initial notification', error);
    }
  }

  /**
   * Android: background notification tap handler
   */
  private async handleNotificationEvent(event: Event): Promise<void> {
    const { type, detail } = event;

    switch (type) {
      case EventType.PRESS:
      case EventType.ACTION_PRESS: {
        const data = detail.notification?.data || {};
        const clixPayload = this.parseClixPayload(data);
        if (clixPayload) {
          await this.trackPushTappedEvent(clixPayload);
        }
        if (this.autoHandleLandingUrl) {
          await this.handleUrlNavigation(data);
        }
        break;
      }
      case EventType.DISMISSED:
        ClixLogger.debug('Notification dismissed');
        break;
      default:
        ClixLogger.debug('Unhandled notification event type:', type);
    }
  }

  /**
   * iOS & Android: foreground notification tap handler
   */
  private async handleForegroundNotificationEvent(event: Event): Promise<void> {
    try {
      await this.foregroundEventHandler?.(event);
    } catch (error) {
      ClixLogger.error('Foreground notification event handler failed', error);
    }

    await this.handleNotificationEvent(event);
  }

  /**
   * Android: background notification tap handler (wrapper for user handler + SDK handler)
   */
  private async handleBackgroundNotificationEvent(event: Event): Promise<void> {
    try {
      await this.backgroundEventHandler?.(event);
    } catch (error) {
      ClixLogger.error('Background notification event handler failed', error);
    }

    await this.handleNotificationEvent(event);
  }

  private async trackPushReceivedEvent(
    payload: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      await this.eventService.trackEvent(
        'PUSH_NOTIFICATION_RECEIVED',
        {},
        payload.messageId,
        payload.userJourneyId,
        payload.userJourneyNodeId,
        'CLIX'
      );
      ClixLogger.debug(
        'PUSH_NOTIFICATION_RECEIVED event tracked:',
        payload.messageId
      );
    } catch (error) {
      ClixLogger.error(
        'Failed to track PUSH_NOTIFICATION_RECEIVED event',
        error
      );
    }
  }

  private async trackPushTappedEvent(
    payload: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      this.sessionService?.setPendingMessageId(payload.messageId);
      await this.eventService.trackEvent(
        'PUSH_NOTIFICATION_TAPPED',
        {},
        payload.messageId,
        payload.userJourneyId,
        payload.userJourneyNodeId,
        'CLIX'
      );
      ClixLogger.debug(
        'PUSH_NOTIFICATION_TAPPED event tracked:',
        payload.messageId
      );
    } catch (error) {
      ClixLogger.error('Failed to track PUSH_NOTIFICATION_TAPPED event', error);
    }
  }

  private async displayNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      ClixLogger.debug('Creating notification config with content:', {
        title: clixPayload.title,
        body: clixPayload.body,
        hasImage: !!clixPayload.imageUrl,
        imageUrl: clixPayload.imageUrl,
      });

      const notificationConfig = await this.createNotificationConfig(
        remoteMessage,
        clixPayload,
        NotificationService.DEFAULT_CHANNEL.id
      );

      await notifee.displayNotification(notificationConfig);
      ClixLogger.debug(
        'Notification displayed successfully:',
        clixPayload.title
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
    channelId: string
  ) {
    const imageUrl = clixPayload.imageUrl;

    const config: Notification &
      Required<Pick<Notification, 'android' | 'ios'>> = {
      id: remoteMessage.messageId || Date.now().toString(),
      title: clixPayload.title,
      body: clixPayload.body,
      data: remoteMessage.data ?? {},
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        category: AndroidCategory.MESSAGE,
        visibility: AndroidVisibility.PUBLIC,
        groupId: NotificationService.ANDROID_GROUP_ID,
        groupSummary: false,
        groupAlertBehavior: AndroidGroupAlertBehavior.CHILDREN,
        sound: 'default',
        ticker: clixPayload.body,
        style: {
          type: AndroidStyle.BIGTEXT,
          text: clixPayload.body,
        },
        pressAction: {
          id: 'default',
        },
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

    if (imageUrl) {
      ClixLogger.debug('Adding image attachment to notification:', imageUrl);
      config.android.largeIcon = imageUrl;
    }

    return config;
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
      let data = userInfo?.clix;
      if (data == null) {
        ClixLogger.debug("No 'clix' entry found in notification data");
        return null;
      }

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (parseError) {
          ClixLogger.error(
            'Failed to parse Clix payload JSON string',
            parseError
          );
          return null;
        }
      }

      ClixLogger.debug('Parsing Clix payload from notification data:', data);

      const payload: ClixPushNotificationPayload = {
        messageId: data.message_id,
        title: data.title,
        body: data.body,
        imageUrl: data.image_url || undefined,
        landingUrl: data.landing_url || undefined,
        userJourneyId: data.user_journey_id || undefined,
        userJourneyNodeId: data.user_journey_node_id || undefined,
      };

      ClixLogger.debug('Constructed Clix payload:', payload);

      if (!payload.messageId) {
        ClixLogger.error('No messageId found in Clix payload');
        return null;
      }
      if (!payload.title) {
        ClixLogger.error('No title found in Clix payload');
        return null;
      }
      if (!payload.body) {
        ClixLogger.error('No body found in Clix payload');
        return null;
      }

      return payload;
    } catch (error) {
      ClixLogger.error('Failed to parse Clix payload', error);
      return null;
    }
  }
}
