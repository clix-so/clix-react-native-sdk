import { type NotificationSettings } from '@notifee/react-native';
import type {
  BackgroundMessageHandler,
  ForegroundEventHandler,
  MessageHandler,
  NotificationOpenedAppHandler,
  TokenRefreshHandler,
} from '../services/NotificationService';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { Clix } from './Clix';

interface ConfigureOptions {
  /**
   * @default false
   */
  autoRequestPermission?: boolean;
  /**
   * @default true
   */
  autoHandleLandingURL?: boolean;
}

export class ClixNotification {
  static shared: ClixNotification = new ClixNotification();

  async configure(options: ConfigureOptions = {}) {
    const { autoRequestPermission = false, autoHandleLandingURL = true } =
      options;

    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }

      notificationService.autoHandleLandingUrl = autoHandleLandingURL;

      if (autoRequestPermission) {
        await notificationService.requestPermission();
      }
    } catch (error) {
      ClixLogger.error('Failed to configure notifications', error);
    }
  }

  async requestPermission(): Promise<NotificationSettings | undefined> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      return await Clix.shared?.notificationService?.requestPermission();
    } catch (error) {
      ClixLogger.error('Failed to request notification permission', error);
      return undefined;
    }
  }

  async setPermissionGranted(isGranted: boolean): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      return await Clix.shared?.notificationService?.setPermissionGranted(
        isGranted
      );
    } catch (error) {
      ClixLogger.error(
        'Failed to update push permission status on server',
        error
      );
    }
  }

  async getToken(): Promise<string | undefined> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      return Clix.shared?.tokenService?.getCurrentToken();
    } catch (error) {
      ClixLogger.error('Failed to get push token', error);
      return undefined;
    }
  }

  async onMessage(handler?: MessageHandler): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }
      notificationService.messageHandler = handler;
    } catch (error) {
      ClixLogger.error('Failed to register onMessage handler', error);
    }
  }

  async onBackgroundMessage(handler?: BackgroundMessageHandler): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }
      notificationService.backgroundMessageHandler = handler;
    } catch (error) {
      ClixLogger.error('Failed to register onBackgroundMessage handler', error);
    }
  }

  async onNotificationOpenedApp(
    handler?: NotificationOpenedAppHandler
  ): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }
      notificationService.notificationOpenedAppHandler = handler;
    } catch (error) {
      ClixLogger.error(
        'Failed to register onNotificationOpened handler',
        error
      );
    }
  }

  async onTokenRefresh(handler?: TokenRefreshHandler): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }
      notificationService.tokenRefreshHandler = handler;
    } catch (error) {
      ClixLogger.error('Failed to register onTokenRefresh handler', error);
    }
  }

  async onForegroundEvent(handler?: ForegroundEventHandler): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }
      notificationService.foregroundEventHandler = handler;
    } catch (error) {
      ClixLogger.error('Failed to register onForegroundEvent handler', error);
    }
  }
}
