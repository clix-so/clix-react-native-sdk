import { ClixDateFormatter } from '../utils/ClixDateFormatter';
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
    messageId?: string,
    userJourneyId?: string,
    userJourneyNodeId?: string
  ): Promise<void> {
    try {
      ClixLogger.debug(`Tracking event: ${name}`);

      const deviceId = this.deviceService.getCurrentDeviceId();

      const cleanProperties: Record<string, any> = {};
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            cleanProperties[key] = value;
            return;
          }

          if (value instanceof Date) {
            cleanProperties[key] = ClixDateFormatter.format(value);
            return;
          }

          if (
            typeof value === 'string' ||
            typeof value === 'boolean' ||
            typeof value === 'number'
          ) {
            cleanProperties[key] = value;
            return;
          }

          cleanProperties[key] = String(value);
        });
      }

      await this.eventAPIService.trackEvent(
        deviceId,
        name,
        cleanProperties,
        messageId,
        userJourneyId,
        userJourneyNodeId
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
