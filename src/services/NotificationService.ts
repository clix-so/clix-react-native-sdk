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
  private static readonly CHANNEL_ID = 'clix_channel';
  private static readonly CHANNEL_NAME = 'Clix Notifications';

  private firebaseMessaging: ReturnType<typeof messaging>;
  private isInitialized = false;
  private currentToken: string | null = null;

  private eventService!: EventService;
  private storageService!: StorageService;
  private deviceService?: DeviceService;
  private tokenService?: TokenService;

  private unsubscribeForegroundMessage?: () => void;
  private unsubscribeNotificationOpened?: () => void;
  private unsubscribeTokenRefresh?: () => void;

  constructor() {
    this.firebaseMessaging = messaging();
    ClixLogger.info('📱 NotificationService constructor called');
    ClixLogger.debug('NotificationService.constructor - Initial FCM state:', {
      hasMessaging: !!this.firebaseMessaging,
      messagingType: typeof this.firebaseMessaging,
    });

    // FCM 기본 설정 즉시 확인
    this.validateFCMSetup();
  }

  private validateFCMSetup(): void {
    try {
      ClixLogger.debug(
        'NotificationService.validateFCMSetup - Validating FCM setup'
      );

      // 기본 FCM 메서드들이 존재하는지 확인
      const methods = [
        'getToken',
        'onMessage',
        'onNotificationOpenedApp',
        'getInitialNotification',
        'requestPermission',
        'hasPermission',
      ];

      const firebaseMessaging = this.firebaseMessaging;
      const availableMethods = methods.filter(
        (method) =>
          typeof firebaseMessaging[method as keyof typeof firebaseMessaging] ===
          'function'
      );

      ClixLogger.debug(
        'NotificationService.validateFCMSetup - Available FCM methods:',
        availableMethods
      );

      if (availableMethods.length !== methods.length) {
        ClixLogger.warn(
          'NotificationService.validateFCMSetup - Some FCM methods are missing!',
          {
            expected: methods,
            available: availableMethods,
            missing: methods.filter((m) => !availableMethods.includes(m)),
          }
        );
      } else {
        ClixLogger.debug(
          'NotificationService.validateFCMSetup - All FCM methods available ✅'
        );
      }
    } catch (error) {
      ClixLogger.error(
        'NotificationService.validateFCMSetup - FCM validation failed:',
        error
      );
    }
  }

  async initialize(
    eventService: EventService,
    storageService: StorageService,
    deviceService?: DeviceService,
    tokenService?: TokenService
  ): Promise<void> {
    if (this.isInitialized) {
      ClixLogger.warn(
        'NotificationService already initialized, but re-checking handlers...'
      );
      // 이미 초기화되었지만 핸들러가 제대로 등록되지 않았을 수 있으므로 재확인
      await this.ensureHandlersAreActive();
      return;
    }

    try {
      ClixLogger.info('🚀 STARTING NOTIFICATION SERVICE INITIALIZATION 🚀');
      ClixLogger.info('Initializing notification service');
      ClixLogger.debug('NotificationService.initialize - Services provided:', {
        hasEventService: !!eventService,
        hasStorageService: !!storageService,
        hasDeviceService: !!deviceService,
        hasTokenService: !!tokenService,
      });

      // FCM 기본 가용성 체크
      ClixLogger.debug(
        'NotificationService.initialize - Checking Firebase Messaging availability'
      );
      try {
        const isSupported = (await messaging().isSupported?.()) ?? true;
        ClixLogger.debug(
          'NotificationService.initialize - FCM supported:',
          isSupported
        );
        if (!isSupported) {
          throw new Error('Firebase Messaging is not supported on this device');
        }
      } catch (error) {
        ClixLogger.error(
          'NotificationService.initialize - FCM availability check failed:',
          error
        );
        throw error;
      }

      this.eventService = eventService;
      this.storageService = storageService;
      this.deviceService = deviceService;
      this.tokenService = tokenService;

      ClixLogger.debug(
        'NotificationService.initialize - Starting notification initialization'
      );
      await this.initializeNotifications();

      ClixLogger.debug(
        'NotificationService.initialize - Registering background handler'
      );
      this.registerBackgroundHandler();

      ClixLogger.debug(
        'NotificationService.initialize - Setting up message handlers'
      );
      this.setupMessageHandlers();

      // FCM 서비스 상태 확인
      ClixLogger.debug(
        'NotificationService.initialize - Checking FCM service availability'
      );
      await this.checkFCMServiceStatus();

      ClixLogger.debug(
        'NotificationService.initialize - Requesting permission'
      );
      const settings = await this.requestPermission();
      ClixLogger.debug(
        'NotificationService.initialize - Permission result:',
        settings
      );

      if (settings !== messaging.AuthorizationStatus.DENIED) {
        ClixLogger.debug(
          'NotificationService.initialize - Permission granted, getting token'
        );
        await this.getAndUpdateToken();
        ClixLogger.debug(
          'NotificationService.initialize - Setting up token refresh listener'
        );
        this.setupTokenRefreshListener();
      } else {
        ClixLogger.warn('Push notification permission denied');
      }
      this.isInitialized = true;
      ClixLogger.info('✅ Notification service initialized successfully');

      // 초기화 완료 후 즉시 상태 체크
      ClixLogger.info('🔍 Performing post-initialization debug check...');
      setTimeout(async () => {
        await this.debugPushReceive();
      }, 500);
    } catch (error) {
      ClixLogger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  private async initializeNotifications(): Promise<void> {
    ClixLogger.debug(
      'NotificationService.initializeNotifications - Requesting notifee permission'
    );
    const notifeePermissions = await notifee.requestPermission({
      alert: true,
      badge: true,
      sound: true,
    });
    ClixLogger.debug(
      'NotificationService.initializeNotifications - Notifee permission result:',
      notifeePermissions
    );

    if (Platform.OS === 'android') {
      ClixLogger.debug(
        'NotificationService.initializeNotifications - Creating Android channel'
      );
      await notifee.createChannel({
        id: NotificationService.CHANNEL_ID,
        name: NotificationService.CHANNEL_NAME,
        description: 'Notifications from Clix',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        lights: true,
      });
      ClixLogger.debug(
        'NotificationService.initializeNotifications - Android channel created'
      );
    }

    ClixLogger.debug(
      'NotificationService.initializeNotifications - Setting up foreground event handler'
    );
    notifee.onForegroundEvent(async ({ type, detail }) => {
      ClixLogger.debug(
        'NotificationService.initializeNotifications - Foreground event received:',
        {
          type,
          hasNotification: !!detail.notification,
          hasData: !!detail.notification?.data,
        }
      );

      if (type === EventType.PRESS && detail.notification?.data) {
        ClixLogger.debug(
          'NotificationService.initializeNotifications - Notification pressed, handling tap'
        );
        await this.handleNotificationTap(detail.notification.data ?? {});
      }
    });
  }

  private registerBackgroundHandler(): void {
    ClixLogger.debug(
      'NotificationService.registerBackgroundHandler - Setting up background message handler'
    );
    this.firebaseMessaging.setBackgroundMessageHandler(
      async (remoteMessage) => {
        try {
          ClixLogger.info(
            'Background message received:',
            remoteMessage.messageId
          );
          ClixLogger.debug(
            'NotificationService.registerBackgroundHandler - Background message details:',
            {
              messageId: remoteMessage.messageId,
              data: remoteMessage.data,
              notification: remoteMessage.notification,
              from: remoteMessage.from,
              collapseKey: remoteMessage.collapseKey,
              sentTime: remoteMessage.sentTime,
              ttl: remoteMessage.ttl,
            }
          );

          const clixPayload = this.parseClixPayload(remoteMessage.data ?? {});
          ClixLogger.debug(
            'NotificationService.registerBackgroundHandler - Parsed Clix payload:',
            clixPayload
          );

          if (!clixPayload) {
            ClixLogger.debug(
              'NotificationService.registerBackgroundHandler - No Clix payload found, skipping'
            );
            return;
          }

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
    ClixLogger.debug(
      'NotificationService.handleBackgroundMessage - Starting background message handling'
    );

    const storageService = new StorageService();
    const backgroundData = {
      messageId: remoteMessage.messageId,
      data: remoteMessage.data ?? {},
      timestamp: Date.now(),
      clixMessageId: clixPayload.messageId,
      campaignId: clixPayload.campaignId,
      trackingId: clixPayload.trackingId,
    };

    ClixLogger.debug(
      'NotificationService.handleBackgroundMessage - Saving background notification data:',
      backgroundData
    );
    await storageService.set('last_background_notification', backgroundData);

    ClixLogger.debug(
      'NotificationService.handleBackgroundMessage - Tracking event in background'
    );
    await this.trackEventInBackground(clixPayload);

    if (!remoteMessage.notification) {
      ClixLogger.debug(
        'NotificationService.handleBackgroundMessage - No notification in message, showing background notification'
      );
      await this.showBackgroundNotification(remoteMessage, clixPayload);
    } else {
      ClixLogger.debug(
        'NotificationService.handleBackgroundMessage - Notification already present, skipping display'
      );
    }
  }

  private setupMessageHandlers(): void {
    ClixLogger.debug(
      'NotificationService.setupMessageHandlers - Setting up foreground message handler'
    );

    // 기존 리스너 정리
    if (this.unsubscribeForegroundMessage) {
      ClixLogger.debug(
        'NotificationService.setupMessageHandlers - Cleaning up existing foreground message handler'
      );
      this.unsubscribeForegroundMessage();
    }

    ClixLogger.debug(
      'NotificationService.setupMessageHandlers - About to register onMessage handler'
    );

    this.unsubscribeForegroundMessage = this.firebaseMessaging.onMessage(
      async (remoteMessage) => {
        ClixLogger.info('🔥🔥🔥 FOREGROUND MESSAGE HANDLER TRIGGERED! 🔥🔥🔥');
        ClixLogger.debug(
          'NotificationService.setupMessageHandlers - Foreground message received!'
        );
        ClixLogger.debug(
          'NotificationService.setupMessageHandlers - Raw message:',
          JSON.stringify(remoteMessage, null, 2)
        );
        try {
          await this.onForegroundMessage(remoteMessage);
        } catch (error) {
          ClixLogger.error(
            'NotificationService.setupMessageHandlers - Error in onForegroundMessage:',
            error
          );
        }
      }
    );

    ClixLogger.debug(
      'NotificationService.setupMessageHandlers - onMessage handler registered successfully'
    );

    ClixLogger.debug(
      'NotificationService.setupMessageHandlers - Foreground message handler set up successfully'
    );

    // 핸들러 설정 확인을 위한 즉시 테스트
    ClixLogger.debug(
      'NotificationService.setupMessageHandlers - Testing handler registration'
    );
    setTimeout(() => {
      ClixLogger.debug(
        'NotificationService.setupMessageHandlers - Handler status after setup:',
        {
          foregroundHandler: !!this.unsubscribeForegroundMessage,
          handlerType: typeof this.unsubscribeForegroundMessage,
        }
      );
    }, 100);

    ClixLogger.debug(
      'NotificationService.setupMessageHandlers - Setting up notification opened handler'
    );

    // 기존 리스너 정리
    if (this.unsubscribeNotificationOpened) {
      ClixLogger.debug(
        'NotificationService.setupMessageHandlers - Cleaning up existing notification opened handler'
      );
      this.unsubscribeNotificationOpened();
    }

    this.unsubscribeNotificationOpened =
      this.firebaseMessaging.onNotificationOpenedApp(async (remoteMessage) => {
        ClixLogger.debug(
          'NotificationService.setupMessageHandlers - Notification opened from background'
        );
        await this.handleNotificationTap(remoteMessage.data ?? {});
      });

    ClixLogger.debug(
      'NotificationService.setupMessageHandlers - Checking initial notification'
    );
    this.checkInitialNotification();
  }

  private async checkInitialNotification(): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.checkInitialNotification - Getting initial notification'
      );
      const initialNotification =
        await this.firebaseMessaging.getInitialNotification();

      if (initialNotification) {
        ClixLogger.info(
          'App launched from notification:',
          initialNotification.messageId
        );
        ClixLogger.debug(
          'NotificationService.checkInitialNotification - Initial notification details:',
          {
            messageId: initialNotification.messageId,
            data: initialNotification.data,
            notification: initialNotification.notification,
          }
        );
        await this.handleNotificationTap(initialNotification.data ?? {});
      } else {
        ClixLogger.debug(
          'NotificationService.checkInitialNotification - No initial notification found'
        );
      }
    } catch (error) {
      ClixLogger.error('Failed to handle initial notification', error);
    }
  }

  private async checkFCMServiceStatus(): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.checkFCMServiceStatus - Checking messaging availability'
      );

      // 메시징 서비스가 사용 가능한지 확인
      const isSupported = (await messaging().isSupported?.()) ?? true;
      ClixLogger.debug(
        'NotificationService.checkFCMServiceStatus - Messaging supported:',
        isSupported
      );

      // 현재 등록 토큰 상태 확인
      try {
        const token = await this.firebaseMessaging.getToken();
        ClixLogger.debug(
          'NotificationService.checkFCMServiceStatus - Current token available:',
          !!token
        );
        if (token) {
          ClixLogger.debug(
            'NotificationService.checkFCMServiceStatus - Token prefix:',
            token.substring(0, 20) + '...'
          );
        }
      } catch (tokenError) {
        ClixLogger.error(
          'NotificationService.checkFCMServiceStatus - Error getting token:',
          tokenError
        );
      }

      // 앱 상태 확인
      ClixLogger.debug(
        'NotificationService.checkFCMServiceStatus - Platform:',
        Platform.OS
      );

      // 메시지 핸들러 등록 상태 확인
      ClixLogger.debug(
        'NotificationService.checkFCMServiceStatus - Message handlers status:',
        {
          foregroundHandler: !!this.unsubscribeForegroundMessage,
          notificationOpenedHandler: !!this.unsubscribeNotificationOpened,
          tokenRefreshHandler: !!this.unsubscribeTokenRefresh,
        }
      );
    } catch (error) {
      ClixLogger.error(
        'NotificationService.checkFCMServiceStatus - Error checking FCM status:',
        error
      );
    }
  }

  private async requestPermission(): Promise<FirebaseMessagingTypes.AuthorizationStatus> {
    ClixLogger.debug(
      'NotificationService.requestPermission - Requesting FCM permission'
    );
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
    ClixLogger.debug(
      'NotificationService.requestPermission - Permission settings:',
      settings
    );

    await this.storageService.set(
      'notification_permission_status',
      settings.toString()
    );
    ClixLogger.debug(
      'NotificationService.requestPermission - Permission status saved to storage'
    );
    return settings;
  }

  private setupTokenRefreshListener(): void {
    ClixLogger.debug(
      'NotificationService.setupTokenRefreshListener - Setting up token refresh listener'
    );
    this.unsubscribeTokenRefresh = this.firebaseMessaging.onTokenRefresh(
      async (token) => {
        try {
          ClixLogger.info('FCM token refreshed');
          ClixLogger.debug(
            'NotificationService.setupTokenRefreshListener - New token received:',
            {
              tokenPrefix: token.substring(0, 20) + '...',
              tokenLength: token.length,
            }
          );

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
      ClixLogger.info('🔥 FOREGROUND MESSAGE RECEIVED! 🔥');
      ClixLogger.info('Received foreground message:', remoteMessage.messageId);
      ClixLogger.debug(
        'NotificationService.onForegroundMessage - Complete message object:',
        JSON.stringify(remoteMessage, null, 2)
      );
      ClixLogger.debug(
        'NotificationService.onForegroundMessage - Message details:',
        {
          messageId: remoteMessage.messageId,
          data: remoteMessage.data,
          notification: remoteMessage.notification,
          from: remoteMessage.from,
          collapseKey: remoteMessage.collapseKey,
          sentTime: remoteMessage.sentTime,
          ttl: remoteMessage.ttl,
        }
      );

      // 메시지 데이터가 있는지 확인
      if (!remoteMessage.data || Object.keys(remoteMessage.data).length === 0) {
        ClixLogger.warn(
          'NotificationService.onForegroundMessage - No data in message, using notification fallback'
        );
        if (remoteMessage.notification) {
          ClixLogger.debug(
            'NotificationService.onForegroundMessage - Found FCM notification, showing as is'
          );
          await this.showFallbackNotification(remoteMessage);
        } else {
          ClixLogger.warn(
            'NotificationService.onForegroundMessage - No notification or data found in message'
          );
        }
        return;
      }

      const clixPayload = this.parseClixPayload(remoteMessage.data ?? {});
      ClixLogger.debug(
        'NotificationService.onForegroundMessage - Parsed Clix payload:',
        clixPayload
      );

      if (clixPayload) {
        ClixLogger.debug(
          'NotificationService.onForegroundMessage - Clix payload found, processing'
        );
        await this.handlePushReceived(remoteMessage.data ?? {});
        await this.showForegroundNotification(remoteMessage, clixPayload);
      } else {
        ClixLogger.warn(
          'NotificationService.onForegroundMessage - No Clix payload found, trying fallback notification'
        );
        if (remoteMessage.notification) {
          await this.showFallbackNotification(remoteMessage);
        } else {
          ClixLogger.warn(
            'NotificationService.onForegroundMessage - No fallback notification available'
          );
        }
      }
    } catch (error) {
      ClixLogger.error('Failed to handle foreground message', error);
      ClixLogger.error(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack trace'
      );
    }
  }

  private async handlePushReceived(data: Record<string, any>): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.handlePushReceived - Processing push received event'
      );
      const clixPayload = this.parseClixPayload(data);
      ClixLogger.debug(
        'NotificationService.handlePushReceived - Parsed payload for tracking:',
        clixPayload
      );

      if (clixPayload) {
        ClixLogger.debug(
          'NotificationService.handlePushReceived - Tracking PUSH_NOTIFICATION_RECEIVED event'
        );
        await this.trackPushEvent('PUSH_NOTIFICATION_RECEIVED', clixPayload);
      }
      ClixLogger.info('Push notification received and processed');
    } catch (error) {
      ClixLogger.error('Failed to handle push received', error);
    }
  }

  private async handlePushTapped(data: Record<string, any>): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.handlePushTapped - Processing push tapped event'
      );
      const clixPayload = this.parseClixPayload(data);
      ClixLogger.debug(
        'NotificationService.handlePushTapped - Parsed payload for tracking:',
        clixPayload
      );

      if (clixPayload) {
        ClixLogger.debug(
          'NotificationService.handlePushTapped - Tracking PUSH_NOTIFICATION_TAPPED event'
        );
        await this.trackPushEvent('PUSH_NOTIFICATION_TAPPED', clixPayload);
      }

      ClixLogger.debug(
        'NotificationService.handlePushTapped - Handling URL navigation'
      );
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
      ClixLogger.debug(
        'NotificationService.handleNotificationTap - Handling notification tap'
      );
      ClixLogger.debug(
        'NotificationService.handleNotificationTap - Tap data:',
        data
      );
      await this.handlePushTapped(data);
    } catch (error) {
      ClixLogger.error('Failed to handle notification tap', error);
    }
  }

  private async handleUrlNavigation(data: Record<string, any>): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.handleUrlNavigation - Starting URL navigation handling'
      );
      let url: string | undefined;
      const clixPayload = this.parseClixPayload(data);

      if (clixPayload) {
        url = clixPayload.landingUrl;
        ClixLogger.debug(
          'NotificationService.handleUrlNavigation - URL from Clix payload:',
          url
        );
      }

      url =
        url || data.landing_url || data.url || data.link || data.click_action;
      ClixLogger.debug(
        'NotificationService.handleUrlNavigation - Final URL to open:',
        url
      );

      if (url) {
        ClixLogger.info('Opening URL from notification:', url);
        try {
          ClixLogger.debug(
            'NotificationService.handleUrlNavigation - Checking if URL can be opened'
          );
          const supported = await Linking.canOpenURL(url);
          ClixLogger.debug(
            'NotificationService.handleUrlNavigation - Can open URL:',
            supported
          );

          if (supported) {
            ClixLogger.debug(
              'NotificationService.handleUrlNavigation - Opening URL'
            );
            await Linking.openURL(url);
            ClixLogger.info('URL opened successfully:', url);
          } else {
            ClixLogger.warn('Cannot open URL:', url);
            ClixLogger.debug(
              'NotificationService.handleUrlNavigation - Attempting to open unsupported URL'
            );
            await Linking.openURL(url);
          }
        } catch (error) {
          ClixLogger.error('Error opening URL:', error);
        }
      } else {
        ClixLogger.debug(
          'NotificationService.handleUrlNavigation - No URL found in notification data'
        );
      }
    } catch (error) {
      ClixLogger.error('Failed to handle URL navigation', error);
    }
  }

  async getCurrentToken(): Promise<string | null> {
    try {
      ClixLogger.debug(
        'NotificationService.getCurrentToken - Getting current FCM token'
      );
      this.currentToken = await this.getOrFetchToken();
      ClixLogger.debug('NotificationService.getCurrentToken - Token result:', {
        hasToken: !!this.currentToken,
        tokenPrefix: this.currentToken
          ? this.currentToken.substring(0, 20) + '...'
          : null,
      });
      return this.currentToken;
    } catch (error) {
      ClixLogger.error('Failed to get FCM token', error);
      return null;
    }
  }

  private async getAndUpdateToken(): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.getAndUpdateToken - Getting and updating FCM token'
      );
      const token = await this.getCurrentToken();
      if (token) {
        ClixLogger.debug(
          'NotificationService.getAndUpdateToken - Registering token with server'
        );
        await this.registerTokenWithServer(token);
      } else {
        ClixLogger.debug(
          'NotificationService.getAndUpdateToken - No token available'
        );
      }
    } catch (error) {
      ClixLogger.error('Failed to update token', error);
    }
  }

  private async getOrFetchToken(): Promise<string | null> {
    ClixLogger.debug(
      'NotificationService.getOrFetchToken - Getting or fetching FCM token'
    );

    if (this.tokenService) {
      ClixLogger.debug(
        'NotificationService.getOrFetchToken - Checking saved token via TokenService'
      );
      const savedToken = await this.tokenService.getCurrentToken();
      if (savedToken) {
        ClixLogger.debug(
          'NotificationService.getOrFetchToken - Found saved token'
        );
        return savedToken;
      }
      ClixLogger.debug(
        'NotificationService.getOrFetchToken - No saved token found'
      );
    }

    ClixLogger.debug(
      'NotificationService.getOrFetchToken - Fetching new token from Firebase'
    );
    const token = await this.firebaseMessaging.getToken();

    if (token) {
      ClixLogger.info('Got FCM token:', token.substring(0, 20) + '...');
      ClixLogger.debug('NotificationService.getOrFetchToken - Token details:', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...',
      });

      if (this.tokenService) {
        ClixLogger.debug(
          'NotificationService.getOrFetchToken - Saving token via TokenService'
        );
        await this.tokenService.saveToken(token);
      }
    } else {
      ClixLogger.debug(
        'NotificationService.getOrFetchToken - No token received from Firebase'
      );
    }

    return token;
  }

  private async saveAndRegisterToken(token: string): Promise<void> {
    ClixLogger.debug(
      'NotificationService.saveAndRegisterToken - Saving and registering new token'
    );

    if (this.tokenService) {
      ClixLogger.debug(
        'NotificationService.saveAndRegisterToken - Saving token via TokenService'
      );
      await this.tokenService.saveToken(token);
      ClixLogger.info('New FCM token saved via TokenService');
    }

    ClixLogger.debug(
      'NotificationService.saveAndRegisterToken - Registering token with server'
    );
    await this.registerTokenWithServer(token);
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    ClixLogger.debug(
      'NotificationService.registerTokenWithServer - Registering token with server'
    );

    if (this.deviceService) {
      ClixLogger.debug(
        'NotificationService.registerTokenWithServer - Using DeviceService to upsert token'
      );
      await this.deviceService.upsertToken(token);
      ClixLogger.info('FCM token registered with server');
    } else {
      ClixLogger.debug(
        'NotificationService.registerTokenWithServer - No DeviceService available'
      );
    }
  }

  private parseClixPayload(
    userInfo: Record<string, any>
  ): ClixPushNotificationPayload | null {
    try {
      ClixLogger.debug(
        'NotificationService.parseClixPayload - Parsing Clix payload'
      );
      ClixLogger.debug(
        'NotificationService.parseClixPayload - Raw userInfo:',
        userInfo
      );

      // clix 오브젝트 또는 snake_case를 camelCase로 변환
      let payload: any = userInfo;
      if (userInfo.clix) {
        ClixLogger.debug(
          'NotificationService.parseClixPayload - Found clix object in userInfo'
        );
        if (typeof userInfo.clix === 'object') {
          payload = userInfo.clix;
          ClixLogger.debug(
            'NotificationService.parseClixPayload - Using clix object directly'
          );
        } else if (typeof userInfo.clix === 'string') {
          ClixLogger.debug(
            'NotificationService.parseClixPayload - Parsing clix string as JSON'
          );
          payload = JSON.parse(userInfo.clix);
        }
      } else {
        ClixLogger.debug(
          'NotificationService.parseClixPayload - No clix object found, using userInfo directly'
        );
      }

      // snake_case → camelCase 변환
      const toCamel = (s: string) =>
        s.replace(/_([a-z])/g, (g) => (g[1] ?? '').toUpperCase());
      const result: any = {};

      if (!payload) {
        ClixLogger.debug(
          'NotificationService.parseClixPayload - No payload to process'
        );
        return null;
      }

      ClixLogger.debug(
        'NotificationService.parseClixPayload - Converting snake_case to camelCase'
      );
      for (const key in payload) {
        const camelKey = toCamel(key);
        result[camelKey] = payload[key];
        ClixLogger.debug(
          `NotificationService.parseClixPayload - Converted ${key} -> ${camelKey}: ${payload[key]}`
        );
      }

      ClixLogger.debug(
        'NotificationService.parseClixPayload - Final converted payload:',
        result
      );

      if (!result.messageId) {
        ClixLogger.debug(
          'NotificationService.parseClixPayload - No messageId found in payload'
        );
        return null;
      }

      const clixPayload = new ClixPushNotificationPayload(result);
      ClixLogger.debug(
        'NotificationService.parseClixPayload - Created ClixPushNotificationPayload:',
        clixPayload
      );
      return clixPayload;
    } catch (error) {
      ClixLogger.error('Failed to parse Clix payload', error);
      return null;
    }
  }

  getMessageId(userInfo: Record<string, any>): string | undefined {
    ClixLogger.debug(
      'NotificationService.getMessageId - Getting message ID from userInfo'
    );
    const clixPayload = this.parseClixPayload(userInfo);
    const messageId = clixPayload?.messageId;
    ClixLogger.debug('NotificationService.getMessageId - Result:', messageId);
    return messageId;
  }

  private async showForegroundNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.showForegroundNotification - Showing foreground notification'
      );
      ClixLogger.debug(
        'NotificationService.showForegroundNotification - Remote message:',
        {
          messageId: remoteMessage.messageId,
          notification: remoteMessage.notification,
          data: remoteMessage.data,
        }
      );
      ClixLogger.debug(
        'NotificationService.showForegroundNotification - Clix payload:',
        clixPayload
      );

      const notificationContent = this.extractNotificationContent(
        remoteMessage.notification,
        clixPayload
      );
      ClixLogger.debug(
        'NotificationService.showForegroundNotification - Notification content:',
        notificationContent
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

      ClixLogger.debug(
        'NotificationService.showForegroundNotification - Base notification config:',
        notificationConfig
      );

      if (notificationContent.imageUrl) {
        ClixLogger.debug(
          'NotificationService.showForegroundNotification - Adding image to notification:',
          notificationContent.imageUrl
        );
        if (Platform.OS === 'ios') {
          notificationConfig.ios = {
            attachments: [{ url: notificationContent.imageUrl }],
          };
          ClixLogger.debug(
            'NotificationService.showForegroundNotification - iOS attachment added'
          );
        } else {
          notificationConfig.android!.style = {
            type: AndroidStyle.BIGPICTURE,
            picture: notificationContent.imageUrl,
          } as any; // 타입 호환성 문제 해결
          ClixLogger.debug(
            'NotificationService.showForegroundNotification - Android big picture style added'
          );
        }
      }

      ClixLogger.debug(
        'NotificationService.showForegroundNotification - Final notification config:',
        notificationConfig
      );
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
      ClixLogger.debug(
        'NotificationService.showBackgroundNotification - Showing background notification'
      );
      ClixLogger.debug(
        'NotificationService.showBackgroundNotification - Remote message:',
        {
          messageId: remoteMessage.messageId,
          notification: remoteMessage.notification,
          data: remoteMessage.data,
        }
      );
      ClixLogger.debug(
        'NotificationService.showBackgroundNotification - Clix payload:',
        clixPayload
      );

      const notificationContent = this.extractNotificationContent(
        null,
        clixPayload
      );
      ClixLogger.debug(
        'NotificationService.showBackgroundNotification - Notification content:',
        notificationContent
      );

      const notificationConfig = {
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
            ? ({
                type: AndroidStyle.BIGPICTURE,
                picture: notificationContent.imageUrl,
              } as any) // 타입 호환성 문제 해결
            : undefined,
        },
        ios: notificationContent.imageUrl
          ? {
              attachments: [{ url: notificationContent.imageUrl }],
            }
          : undefined,
      };

      ClixLogger.debug(
        'NotificationService.showBackgroundNotification - Notification config:',
        notificationConfig
      );
      await notifee.displayNotification(notificationConfig);
      ClixLogger.info(
        'Background notification shown:',
        notificationContent.title
      );
    } catch (error) {
      ClixLogger.error('Failed to show background notification', error);
    }
  }

  private async showFallbackNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.showFallbackNotification - Showing fallback notification'
      );
      ClixLogger.debug(
        'NotificationService.showFallbackNotification - Remote message:',
        remoteMessage
      );

      const title = remoteMessage.notification?.title || 'New Message';
      const body = remoteMessage.notification?.body || '';
      const imageUrl =
        remoteMessage.notification?.android?.imageUrl ||
        (remoteMessage.notification?.ios as any)?.attachments?.[0]?.url;

      ClixLogger.debug(
        'NotificationService.showFallbackNotification - Fallback content:',
        { title, body, imageUrl }
      );

      const notificationConfig: NotifeeNotification = {
        id: remoteMessage.messageId || Date.now().toString(),
        title,
        body,
        data: remoteMessage.data ?? {},
        android: {
          channelId: NotificationService.CHANNEL_ID,
          pressAction: {
            id: 'default',
          },
        },
      };

      if (imageUrl) {
        ClixLogger.debug(
          'NotificationService.showFallbackNotification - Adding image:',
          imageUrl
        );
        if (Platform.OS === 'ios') {
          notificationConfig.ios = {
            attachments: [{ url: imageUrl }],
          };
        } else {
          notificationConfig.android!.style = {
            type: AndroidStyle.BIGPICTURE,
            picture: imageUrl,
          } as any;
        }
      }

      ClixLogger.debug(
        'NotificationService.showFallbackNotification - Final config:',
        notificationConfig
      );

      await notifee.displayNotification(notificationConfig);
      ClixLogger.info('Fallback notification displayed successfully');
    } catch (error) {
      ClixLogger.error('Failed to show fallback notification', error);
    }
  }

  private extractNotificationContent(
    fcmNotification: FirebaseMessagingTypes.Notification | null | undefined,
    clixPayload: ClixPushNotificationPayload
  ): NotificationContent {
    ClixLogger.debug(
      'NotificationService.extractNotificationContent - Extracting notification content'
    );
    ClixLogger.debug(
      'NotificationService.extractNotificationContent - FCM notification:',
      fcmNotification
    );
    ClixLogger.debug(
      'NotificationService.extractNotificationContent - Clix payload:',
      clixPayload
    );

    const title =
      fcmNotification?.title ||
      clixPayload.customProperties?.title ||
      'New Message';
    const body =
      fcmNotification?.body || clixPayload.customProperties?.body || '';
    const imageUrl = clixPayload.imageUrl;

    const content = {
      title,
      body,
      imageUrl,
    };

    ClixLogger.debug(
      'NotificationService.extractNotificationContent - Extracted content:',
      content
    );
    return content;
  }

  private async trackPushEvent(
    eventType: string,
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    ClixLogger.debug(
      'NotificationService.trackPushEvent - Tracking push event'
    );
    ClixLogger.debug(
      'NotificationService.trackPushEvent - Event type:',
      eventType
    );
    ClixLogger.debug(
      'NotificationService.trackPushEvent - Clix payload:',
      clixPayload
    );

    const properties = this.extractTrackingProperties(clixPayload);
    ClixLogger.debug(
      'NotificationService.trackPushEvent - Tracking properties:',
      properties
    );

    const messageId = clixPayload.messageId;
    ClixLogger.debug(
      'NotificationService.trackPushEvent - Message ID:',
      messageId
    );

    await this.eventService.trackEvent(eventType, properties, messageId);
    ClixLogger.info(`${eventType} tracked:`, messageId);
  }

  private extractTrackingProperties(
    clixPayload: ClixPushNotificationPayload
  ): Record<string, any> {
    ClixLogger.debug(
      'NotificationService.extractTrackingProperties - Extracting tracking properties'
    );
    ClixLogger.debug(
      'NotificationService.extractTrackingProperties - Clix payload:',
      clixPayload
    );

    const properties: Record<string, any> = {};
    if (clixPayload.messageId) properties.messageId = clixPayload.messageId;
    if (clixPayload.campaignId) properties.campaignId = clixPayload.campaignId;
    if (clixPayload.trackingId) properties.trackingId = clixPayload.trackingId;

    ClixLogger.debug(
      'NotificationService.extractTrackingProperties - Extracted properties:',
      properties
    );
    return properties;
  }

  private async trackEventInBackground(
    clixPayload: ClixPushNotificationPayload
  ): Promise<void> {
    ClixLogger.debug(
      'NotificationService.trackEventInBackground - Tracking event in background'
    );
    ClixLogger.debug(
      'NotificationService.trackEventInBackground - Clix payload:',
      clixPayload
    );

    const messageId = clixPayload.messageId;
    if (!messageId) {
      ClixLogger.warn('No messageId found in payload, skipping event tracking');
      return;
    }

    try {
      ClixLogger.debug(
        'NotificationService.trackEventInBackground - Creating new StorageService'
      );
      const storageService = new StorageService();

      ClixLogger.debug(
        'NotificationService.trackEventInBackground - Getting Clix config from storage'
      );
      const configData = await storageService.get<Record<string, any>>(
        'clix_config'
      );
      if (!configData) {
        ClixLogger.error('No Clix config found in storage');
        return;
      }
      ClixLogger.debug(
        'NotificationService.trackEventInBackground - Config data found:',
        configData
      );

      ClixLogger.debug(
        'NotificationService.trackEventInBackground - Getting device ID from storage'
      );
      let deviceId = await storageService.get<string>('clix_device_id');
      if (!deviceId) {
        ClixLogger.warn(
          'No device ID found in storage, generating new device ID'
        );
        deviceId = UUID.generate();
        ClixLogger.debug(
          'NotificationService.trackEventInBackground - Generated new device ID:',
          deviceId
        );
        await storageService.set('clix_device_id', deviceId);
      } else {
        ClixLogger.debug(
          'NotificationService.trackEventInBackground - Found existing device ID:',
          deviceId
        );
      }

      const config = configData as ClixConfig;
      ClixLogger.debug(
        'NotificationService.trackEventInBackground - Creating API client and services'
      );
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
      ClixLogger.debug(
        'NotificationService.trackEventInBackground - Tracking properties:',
        properties
      );

      ClixLogger.debug(
        'NotificationService.trackEventInBackground - Tracking PUSH_NOTIFICATION_RECEIVED event'
      );
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
      ClixLogger.debug(
        'NotificationService.requestNotificationPermission - Starting permission request'
      );
      const settings = await this.requestPermission();
      const granted = settings === messaging.AuthorizationStatus.AUTHORIZED;
      ClixLogger.info('Notification permission granted:', granted);
      ClixLogger.debug(
        'NotificationService.requestNotificationPermission - Permission result:',
        {
          settings,
          granted,
        }
      );
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
      ClixLogger.debug(
        'NotificationService.setNotificationPreferences - Setting notification preferences'
      );
      ClixLogger.debug(
        'NotificationService.setNotificationPreferences - Preferences:',
        preferences
      );

      const settings = {
        enabled: preferences.enabled,
        categories: preferences.categories || [],
        timestamp: Date.now(),
      };

      ClixLogger.debug(
        'NotificationService.setNotificationPreferences - Settings to save:',
        settings
      );
      await this.storageService.set('clix_notification_settings', settings);
      ClixLogger.info('Notification preferences saved:', settings.enabled);
    } catch (error) {
      ClixLogger.error('Failed to set notification preferences', error);
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    ClixLogger.debug(
      'NotificationService.setBadgeCount - Setting badge count:',
      count
    );

    if (Platform.OS === 'ios') {
      try {
        ClixLogger.debug(
          'NotificationService.setBadgeCount - Setting iOS badge count'
        );
        await notifee.setBadgeCount(count);
        ClixLogger.info('Badge count set to:', count);
      } catch (error) {
        ClixLogger.error('Failed to set badge count', error);
      }
    } else {
      ClixLogger.debug(
        'NotificationService.setBadgeCount - Badge count only supported on iOS'
      );
    }
  }

  async reset(): Promise<void> {
    try {
      ClixLogger.debug(
        'NotificationService.reset - Resetting notification data'
      );
      await this.storageService.remove('clix_notification_settings');
      await this.storageService.remove('clix_last_notification');

      if (this.tokenService) {
        ClixLogger.debug('NotificationService.reset - Resetting token service');
        await this.tokenService.reset();
      }

      this.currentToken = null;
      ClixLogger.info('Notification data reset completed');
    } catch (error) {
      ClixLogger.error('Failed to reset notification data', error);
    }
  }

  cleanup(): void {
    ClixLogger.debug(
      'NotificationService.cleanup - Cleaning up notification service'
    );
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

  // 디버깅을 위한 추가 메서드들
  async debugPushReceive(): Promise<void> {
    ClixLogger.info('🔍 DEBUG: Testing push notification reception capability');
    ClixLogger.debug(
      'NotificationService.debugPushReceive - Current service state:',
      {
        initialized: this.isInitialized,
        hasToken: !!this.currentToken,
        hasForegroundHandler: !!this.unsubscribeForegroundMessage,
        hasNotificationOpenedHandler: !!this.unsubscribeNotificationOpened,
        hasTokenRefreshHandler: !!this.unsubscribeTokenRefresh,
      }
    );

    try {
      // FCM 인스턴스 상태 확인
      ClixLogger.debug(
        'NotificationService.debugPushReceive - FCM instance check:',
        {
          hasFirebaseMessaging: !!this.firebaseMessaging,
          firebaseMessagingType: typeof this.firebaseMessaging,
        }
      );

      // FCM 토큰 상태 확인
      const token = await this.getCurrentToken();
      ClixLogger.debug('NotificationService.debugPushReceive - Token status:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPrefix: token ? token.substring(0, 20) + '...' : null,
      });

      // 권한 상태 확인
      const authStatus = await messaging().hasPermission();
      ClixLogger.debug(
        'NotificationService.debugPushReceive - FCM Permission status:',
        authStatus
      );

      // Notifee 권한 상태 확인
      const notifeeSettings = await notifee.getNotificationSettings();
      ClixLogger.debug(
        'NotificationService.debugPushReceive - Notifee settings:',
        notifeeSettings
      );

      // 플랫폼별 추가 체크
      if (Platform.OS === 'android') {
        ClixLogger.debug(
          'NotificationService.debugPushReceive - Android specific checks'
        );
        try {
          const channels = await notifee.getChannels();
          ClixLogger.debug(
            'NotificationService.debugPushReceive - Notification channels:',
            channels
          );
        } catch (error) {
          ClixLogger.error(
            'NotificationService.debugPushReceive - Failed to get channels:',
            error
          );
        }
      }

      // FCM 메시지 핸들러 재등록 테스트
      ClixLogger.debug(
        'NotificationService.debugPushReceive - Testing message handler re-registration'
      );
      this.testMessageHandlerRegistration();
    } catch (error) {
      ClixLogger.error(
        'NotificationService.debugPushReceive - Debug check failed:',
        error
      );
    }
  }

  private testMessageHandlerRegistration(): void {
    ClixLogger.debug(
      'NotificationService.testMessageHandlerRegistration - Starting handler test'
    );

    // 기존 핸들러 제거
    if (this.unsubscribeForegroundMessage) {
      ClixLogger.debug(
        'NotificationService.testMessageHandlerRegistration - Removing existing handler'
      );
      this.unsubscribeForegroundMessage();
    }

    // 새 핸들러 등록
    ClixLogger.debug(
      'NotificationService.testMessageHandlerRegistration - Registering new test handler'
    );
    this.unsubscribeForegroundMessage = this.firebaseMessaging.onMessage(
      async (remoteMessage) => {
        ClixLogger.info(
          '🚨🚨🚨 TEST HANDLER TRIGGERED - MESSAGE RECEIVED! 🚨🚨🚨'
        );
        ClixLogger.info('Message ID:', remoteMessage.messageId);
        ClixLogger.info('From:', remoteMessage.from);
        ClixLogger.info('Data keys:', Object.keys(remoteMessage.data || {}));
        ClixLogger.info('Has notification:', !!remoteMessage.notification);

        try {
          await this.onForegroundMessage(remoteMessage);
        } catch (error) {
          ClixLogger.error('TEST HANDLER ERROR:', error);
        }
      }
    );

    ClixLogger.debug(
      'NotificationService.testMessageHandlerRegistration - Test handler registered'
    );
    ClixLogger.info(
      '📱 FCM is now ready to receive messages! Send a test push now.'
    );
  }

  async testNotificationDisplay(): Promise<void> {
    ClixLogger.info('🧪 Testing notification display capability');

    try {
      const testNotification: NotifeeNotification = {
        id: 'test-' + Date.now(),
        title: 'Test Notification',
        body: 'This is a test notification to verify display capability',
        android: {
          channelId: NotificationService.CHANNEL_ID,
          pressAction: {
            id: 'default',
          },
        },
      };

      ClixLogger.debug(
        'NotificationService.testNotificationDisplay - Showing test notification'
      );
      await notifee.displayNotification(testNotification);
      ClixLogger.info('✅ Test notification displayed successfully');
    } catch (error) {
      ClixLogger.error('❌ Failed to display test notification:', error);
    }
  }

  // 정적 메서드로 전역 FCM 상태 체크
  static async checkGlobalFCMStatus(): Promise<void> {
    ClixLogger.info('🌍 Checking global FCM status...');

    try {
      const firebaseMessaging = messaging();
      ClixLogger.debug('Global FCM messaging instance created');

      const isSupported = (await firebaseMessaging.isSupported?.()) ?? true;
      ClixLogger.debug('Global FCM supported:', isSupported);

      const hasPermission = await firebaseMessaging.hasPermission();
      ClixLogger.debug('Global FCM permission:', hasPermission);

      try {
        const token = await firebaseMessaging.getToken();
        ClixLogger.debug('Global FCM token available:', !!token);
        if (token) {
          ClixLogger.debug(
            'Global FCM token prefix:',
            token.substring(0, 20) + '...'
          );
        }
      } catch (tokenError) {
        ClixLogger.error('Global FCM token error:', tokenError);
      }
    } catch (error) {
      ClixLogger.error('Global FCM status check failed:', error);
    }
  }

  // 핸들러가 활성화되어 있는지 확인하고 필요시 재등록
  private async ensureHandlersAreActive(): Promise<void> {
    ClixLogger.info('🔧 Ensuring message handlers are active...');

    try {
      // 현재 핸들러 상태 확인
      const handlersActive = {
        foreground: !!this.unsubscribeForegroundMessage,
        notificationOpened: !!this.unsubscribeNotificationOpened,
        tokenRefresh: !!this.unsubscribeTokenRefresh,
      };

      ClixLogger.debug(
        'NotificationService.ensureHandlersAreActive - Current handler state:',
        handlersActive
      );

      // foreground 핸들러가 없다면 강제로 재등록
      if (!this.unsubscribeForegroundMessage) {
        ClixLogger.warn('Foreground handler missing! Re-registering...');
        this.forceRegisterForegroundHandler();
      } else {
        // 핸들러가 있어도 실제로 작동하는지 테스트
        ClixLogger.debug('Testing existing foreground handler...');
        this.testExistingHandler();
      }

      // 권한 재확인
      const permission = await messaging().hasPermission();
      ClixLogger.debug(
        'NotificationService.ensureHandlersAreActive - Current permission:',
        permission
      );

      // 토큰 재확인
      const token = await this.getCurrentToken();
      ClixLogger.debug(
        'NotificationService.ensureHandlersAreActive - Current token available:',
        !!token
      );

      // 디버그 정보 출력
      await this.debugPushReceive();
    } catch (error) {
      ClixLogger.error(
        'NotificationService.ensureHandlersAreActive - Error:',
        error
      );
    }
  }

  private forceRegisterForegroundHandler(): void {
    ClixLogger.info('🚨 FORCE REGISTERING FOREGROUND HANDLER 🚨');

    try {
      // 기존 핸들러 정리
      if (this.unsubscribeForegroundMessage) {
        this.unsubscribeForegroundMessage();
      }

      // 새 핸들러 등록 - 더 강력한 로깅 포함
      this.unsubscribeForegroundMessage = this.firebaseMessaging.onMessage(
        async (remoteMessage) => {
          ClixLogger.info('🎯🎯🎯 FORCE REGISTERED HANDLER TRIGGERED! 🎯🎯🎯');
          ClixLogger.info('⚡ FOREGROUND MESSAGE RECEIVED - FORCE HANDLER!');
          ClixLogger.info('🔔 Message ID:', remoteMessage.messageId);
          ClixLogger.info('📤 From:', remoteMessage.from);
          ClixLogger.info('📋 Data:', remoteMessage.data);
          ClixLogger.info('🔔 Notification:', remoteMessage.notification);

          try {
            await this.onForegroundMessage(remoteMessage);
          } catch (error) {
            ClixLogger.error('FORCE HANDLER ERROR:', error);
          }
        }
      );

      ClixLogger.info('✅ Foreground handler force registered successfully');

      // 등록 확인
      setTimeout(() => {
        ClixLogger.debug('Force handler verification:', {
          handlerExists: !!this.unsubscribeForegroundMessage,
          handlerType: typeof this.unsubscribeForegroundMessage,
        });
      }, 100);
    } catch (error) {
      ClixLogger.error('Failed to force register foreground handler:', error);
    }
  }

  private testExistingHandler(): void {
    ClixLogger.debug(
      'NotificationService.testExistingHandler - Testing existing handler responsiveness'
    );

    // 핸들러가 등록되어 있는지 다시 확인
    if (this.unsubscribeForegroundMessage) {
      ClixLogger.debug(
        'Existing handler found, type:',
        typeof this.unsubscribeForegroundMessage
      );

      // 임시로 테스트 핸들러 중복 등록하여 확인
      const testUnsubscribe = this.firebaseMessaging.onMessage(
        async (_message) => {
          ClixLogger.info(
            '🧪 TEST HANDLER TRIGGERED - DUPLICATE REGISTRATION TEST 🧪'
          );
          ClixLogger.info(
            'This confirms FCM is working, original handler should also trigger'
          );
          testUnsubscribe(); // 즉시 제거
        }
      );

      ClixLogger.debug(
        'Test duplicate handler registered and will be removed immediately'
      );
    } else {
      ClixLogger.warn('No existing handler found during test');
    }
  }

  // 외부에서 강제로 핸들러 재등록을 요청할 수 있는 메서드
  async forceRefreshHandlers(): Promise<void> {
    ClixLogger.info('🔄 Force refreshing all message handlers...');

    // 모든 핸들러 정리
    this.cleanup();

    // 핸들러 재등록
    this.setupMessageHandlers();

    // 상태 확인
    await this.ensureHandlersAreActive();

    ClixLogger.info('🔄 Handler refresh completed');
  }
}
