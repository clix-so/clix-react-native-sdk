import { ClixLogger } from '../utils/logging/ClixLogger';
import { ClixAPIClient } from './ClixAPIClient';

export class EventAPIService {
  constructor(private readonly apiClient: ClixAPIClient) {}

  async trackEvent(
    deviceId: string,
    name: string,
    properties: Record<string, any>,
    messageId?: string
  ): Promise<void> {
    try {
      ClixLogger.debug(`Tracking event: ${name} for device: ${deviceId}`);

      const eventRequestBody = {
        device_id: deviceId,
        name: name,
        event_property: {
          custom_properties: properties,
          ...(messageId && { message_id: messageId }),
        },
      };

      const response = await this.apiClient.post('/events', {
        body: {
          events: [eventRequestBody],
        },
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `HTTP ${response.status}: ${JSON.stringify(response.data)}`
        );
      }

      ClixLogger.debug(
        `Event tracked successfully: ${name} for device: ${deviceId}`
      );
    } catch (error) {
      ClixLogger.error(
        `Failed to track event: ${name} for device: ${deviceId}`,
        error
      );
      throw error;
    }
  }
}
