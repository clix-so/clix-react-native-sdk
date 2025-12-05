import { ClixDateFormatter } from '../utils/ClixDateFormatter';
import { DeviceService } from './DeviceService';
import { EventAPIService } from './EventAPIService';

export class EventService {
  constructor(
    private readonly eventAPIService: EventAPIService,
    private readonly deviceService: DeviceService
  ) {}

  private serializeProperties(
    properties: Record<string, any> = {}
  ): Record<string, any> {
    const cleanProperties: Record<string, any> = {};

    Object.entries(properties).forEach(([key, value]) => {
      if (value instanceof Date) {
        cleanProperties[key] = ClixDateFormatter.format(value);
        return;
      }

      cleanProperties[key] = value;
    });

    return cleanProperties;
  }

  async trackEvent(
    name: string,
    properties?: Record<string, any>,
    messageId?: string,
    userJourneyId?: string,
    userJourneyNodeId?: string
  ): Promise<void> {
    const deviceId = this.deviceService.getCurrentDeviceId();

    await this.eventAPIService.trackEvent(
      deviceId,
      name,
      this.serializeProperties(properties),
      messageId,
      userJourneyId,
      userJourneyNodeId
    );
  }
}
