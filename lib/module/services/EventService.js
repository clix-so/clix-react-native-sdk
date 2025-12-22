"use strict";

import { ClixDateFormatter } from "../utils/ClixDateFormatter.js";
export class EventService {
  constructor(eventAPIService, deviceService) {
    this.eventAPIService = eventAPIService;
    this.deviceService = deviceService;
  }
  serializeProperties(properties = {}) {
    const cleanProperties = {};
    Object.entries(properties).forEach(([key, value]) => {
      if (value instanceof Date) {
        cleanProperties[key] = ClixDateFormatter.format(value);
        return;
      }
      cleanProperties[key] = value;
    });
    return cleanProperties;
  }
  async trackEvent(name, properties, messageId, userJourneyId, userJourneyNodeId) {
    const deviceId = this.deviceService.getCurrentDeviceId();
    await this.eventAPIService.trackEvent(deviceId, name, this.serializeProperties(properties), messageId, userJourneyId, userJourneyNodeId);
  }
}
//# sourceMappingURL=EventService.js.map