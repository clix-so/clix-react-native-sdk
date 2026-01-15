import { ClixLogger } from '../utils/logging/ClixLogger';
import { ClixAPIClient } from './ClixAPIClient';

export class LiveActivityAPIService {
  constructor(private readonly apiClient: ClixAPIClient) {}

  async registerLiveActivityStartToken(
    deviceId: string,
    activityType: string,
    token: string
  ): Promise<void> {
    try {
      ClixLogger.debug(
        `Registering liveActivityStartToken for device: ${deviceId}, activityType: ${activityType}`
      );

      const response = await this.apiClient.post(
        `/devices/${deviceId}/live-activity-start-tokens`,
        {
          attributes_type: activityType,
          push_to_start_token: token,
        }
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
        );
      }

      ClixLogger.debug(
        `PushToStartToken set successfully for device: ${deviceId}`
      );
    } catch (error) {
      ClixLogger.error(
        `Failed to set pushToStartToken for device: ${deviceId}`,
        error
      );
      throw error;
    }
  }
}
