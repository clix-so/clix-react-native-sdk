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
  static shared?: ClixNotification;

  // @ts-ignore
  private autoHandleLandingURL = true;

  static initialize() {
    this.shared = new ClixNotification();
  }

  async configure(options: ConfigureOptions = {}) {
    const { autoRequestPermission = false, autoHandleLandingURL = true } =
      options;

    this.autoHandleLandingURL = autoHandleLandingURL;

    try {
      await Clix.initCoordinator.waitForInitialization();
      if (autoRequestPermission) {
        await Clix.shared?.notificationService?.requestPermission();
      }
    } catch (error) {
      ClixLogger.error('Failed to configure notifications', error);
    }
  }
}
