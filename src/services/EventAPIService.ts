import { ClixLogger } from '../utils/logging/ClixLogger';
import { ClixAPIClient } from './ClixAPIClient';

export class EventAPIService {
  constructor(private readonly apiClient: ClixAPIClient) {}

  async trackEvent(
    deviceId: string,
    name: string,
    properties: Record<string, any>,
    messageId?: string,
    userJourneyId?: string,
    userJourneyNodeId?: string,
    sourceType?: string
  ): Promise<void> {
    try {
      ClixLogger.debug(`Tracking event: ${name} for device: ${deviceId}`);

      const eventRequestBody = {
        device_id: deviceId,
        name: name,
        ...(sourceType && { source_type: sourceType }),
        event_property: {
          custom_properties: properties,
          ...(messageId && { message_id: messageId }),
          ...(userJourneyId && { user_journey_id: userJourneyId }),
          ...(userJourneyNodeId && { user_journey_node_id: userJourneyNodeId }),
        },
      };

      const response = await this.apiClient.post('/events', {
        events: [eventRequestBody],
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
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
