"use strict";

import { ClixLogger } from "../utils/logging/ClixLogger.js";
export class EventAPIService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }
  async trackEvent(deviceId, name, properties, messageId, userJourneyId, userJourneyNodeId) {
    try {
      ClixLogger.debug(`Tracking event: ${name} for device: ${deviceId}`);
      const eventRequestBody = {
        device_id: deviceId,
        name: name,
        event_property: {
          custom_properties: properties,
          ...(messageId && {
            message_id: messageId
          }),
          ...(userJourneyId && {
            user_journey_id: userJourneyId
          }),
          ...(userJourneyNodeId && {
            user_journey_node_id: userJourneyNodeId
          })
        }
      };
      const response = await this.apiClient.post('/events', {
        events: [eventRequestBody]
      });
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`);
      }
      ClixLogger.debug(`Event tracked successfully: ${name} for device: ${deviceId}`);
    } catch (error) {
      ClixLogger.error(`Failed to track event: ${name} for device: ${deviceId}`, error);
      throw error;
    }
  }
}
//# sourceMappingURL=EventAPIService.js.map