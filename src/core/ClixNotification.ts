import { type NotificationSettings } from '@notifee/react-native';
import type {
  BackgroundMessageHandler,
  FcmTokenErrorHandler,
  ForegroundMessageHandler,
  NotificationOpenedHandler,
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

      notificationService.setAutoHandleLandingUrl(autoHandleLandingURL);

      if (autoRequestPermission) {
        await notificationService.requestPermission();
      }
    } catch (error) {
      ClixLogger.error('Failed to configure notifications', error);
    }
  }

  async requestPermission(): Promise<NotificationSettings | null> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return null;
      }

      return await notificationService.requestPermission();
    } catch (error) {
      ClixLogger.error('Failed to request notification permission', error);
      return null;
    }
  }

  async setPermissionGranted(isGranted: boolean): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }

      await notificationService.setPermissionGranted(isGranted);
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
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return undefined;
      }

      const token = await notificationService.getCurrentToken();
      return token ?? undefined;
    } catch (error) {
      ClixLogger.error('Failed to get push token', error);
      return undefined;
    }
  }

  async onMessage(handler?: ForegroundMessageHandler): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }
      notificationService.setMessageHandler(handler);
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
      notificationService.setBackgroundMessageHandler(handler);
    } catch (error) {
      ClixLogger.error('Failed to register onBackgroundMessage handler', error);
    }
  }

  async onNotificationOpened(
    handler?: NotificationOpenedHandler
  ): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }
      notificationService.setNotificationOpenedHandler(handler);
    } catch (error) {
      ClixLogger.error(
        'Failed to register onNotificationOpened handler',
        error
      );
    }
  }
  async onFcmTokenError(handler?: FcmTokenErrorHandler): Promise<void> {
    try {
      await Clix.initCoordinator.waitForInitialization();
      const notificationService = Clix.shared?.notificationService;
      if (!notificationService) {
        ClixLogger.warn('Notification service is not initialized');
        return;
      }
      notificationService.setFcmTokenErrorHandler(handler);
    } catch (error) {
      ClixLogger.error('Failed to register onFcmTokenError handler', error);
    }
  }
}
