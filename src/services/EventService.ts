import { ClixLogger } from '../utils/logging/ClixLogger';
import { DeviceService } from './DeviceService';
import { EventAPIService } from './EventAPIService';

export class EventService {
  constructor(
    private readonly eventAPIService: EventAPIService,
    private readonly deviceService: DeviceService
  ) {}

  async trackEvent(
    name: string,
    properties?: Record<string, any>,
    messageId?: string
  ): Promise<void> {
    try {
      ClixLogger.debug(`Tracking event: ${name}`);

      const deviceId = await this.deviceService.getCurrentDeviceId();

      const cleanProperties: Record<string, any> = {};
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            cleanProperties[key] = value;
          }
        });
      }

      await this.eventAPIService.trackEvent(
        deviceId,
        name,
        cleanProperties,
        messageId
      );

      ClixLogger.debug(`Event tracked successfully: ${name}`);
    } catch (error) {
      ClixLogger.error(
        `Failed to track event '${name}': ${error}. Make sure Clix.initialize() has been called.`
      );
      throw error;
    }
  }
}
