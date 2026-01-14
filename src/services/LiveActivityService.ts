import type { EmitterSubscription } from 'react-native';
import {
  subscribeToPushToStartToken,
  type PushToStartTokenEvent,
} from '../native/ClixLiveActivityBridge';
import { ClixLogger } from '../utils/logging/ClixLogger';
import type { DeviceService } from './DeviceService';
import type { LiveActivityAPIService } from './LiveActivityAPIService';

export class LiveActivityService {
  private subscription?: EmitterSubscription;
  private isInitialized = false;

  constructor(
    private readonly deviceService: DeviceService,
    private readonly liveActivityAPIService: LiveActivityAPIService
  ) {}

  initialize(): void {
    if (this.isInitialized) {
      ClixLogger.debug('LiveActivityService already initialized');
      return;
    }

    this.subscription = subscribeToPushToStartToken(
      this.handlePushToStartToken.bind(this)
    );

    if (this.subscription) {
      this.isInitialized = true;
      ClixLogger.debug('LiveActivityService initialized successfully');
    }
  }

  cleanup(): void {
    this.subscription?.remove();
    this.subscription = undefined;
    this.isInitialized = false;
    ClixLogger.debug('LiveActivityService cleaned up');
  }

  private async handlePushToStartToken(
    event: PushToStartTokenEvent
  ): Promise<void> {
    try {
      ClixLogger.debug(
        `Received pushToStartToken for ${event.activityType}: ${event.token}`
      );

      const deviceId = this.deviceService.getCurrentDeviceId();

      await this.liveActivityAPIService.setPushToStartToken(
        deviceId,
        event.activityType,
        event.token
      );

      ClixLogger.debug(
        `PushToStartToken sent successfully for ${event.activityType}`
      );
    } catch (error) {
      ClixLogger.error(
        `Failed to send pushToStartToken for ${event.activityType}`,
        error
      );
    }
  }
}
