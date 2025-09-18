export class ClixPushNotificationPayload {
  public readonly messageId: string;
  public readonly campaignId?: string;
  public readonly userId?: string;
  public readonly deviceId?: string;
  public readonly trackingId?: string;
  public readonly landingUrl?: string;
  public readonly imageUrl?: string;
  public readonly customProperties?: Record<string, any>;

  constructor(payload: {
    messageId: string;
    campaignId?: string;
    userId?: string;
    deviceId?: string;
    trackingId?: string;
    landingUrl?: string;
    imageUrl?: string;
    customProperties?: Record<string, any>;
  }) {
    this.messageId = payload.messageId;
    this.campaignId = payload.campaignId;
    this.userId = payload.userId;
    this.deviceId = payload.deviceId;
    this.trackingId = payload.trackingId;
    this.landingUrl = payload.landingUrl;
    this.imageUrl = payload.imageUrl;
    this.customProperties = payload.customProperties;
  }

  equals(other: ClixPushNotificationPayload): boolean {
    return this.messageId === other.messageId;
  }

  toString(): string {
    return `ClixPushNotificationPayload(messageId: ${this.messageId}, campaignId: ${this.campaignId})`;
  }
}
