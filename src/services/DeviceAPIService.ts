import { ClixDevice } from '../models/ClixDevice';
import { ClixUserProperty } from '../models/ClixUserProperty';
import { ClixLogger } from '../utils/logging/ClixLogger';
import { ClixAPIClient } from './ClixAPIClient';

export class DeviceAPIService {
  constructor(private readonly apiClient: ClixAPIClient) {}

  async upsertDevice(device: ClixDevice): Promise<void> {
    try {
      ClixLogger.debug(`Upserting device: ${device.id}`);

      const response = await this.apiClient.post('/devices', {
        devices: [
          {
            id: device.id,
            platform: device.platform,
            model: device.model,
            manufacturer: device.manufacturer,
            os_name: device.osName,
            os_version: device.osVersion,
            locale_region: device.localeRegion,
            locale_language: device.localeLanguage,
            timezone: device.timezone,
            app_name: device.appName,
            app_version: device.appVersion,
            sdk_type: device.sdkType,
            sdk_version: device.sdkVersion,
            ad_id: device.adId,
            is_push_permission_granted: device.isPushPermissionGranted,
            push_token: device.pushToken,
            push_token_type: device.pushTokenType,
          },
        ],
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
        );
      }

      ClixLogger.debug(`Device upserted successfully: ${device.id}`);
    } catch (error) {
      ClixLogger.error(`Failed to upsert device: ${device.id}`, error);
      throw error;
    }
  }

  async setProjectUserId(
    deviceId: string,
    projectUserId: string
  ): Promise<void> {
    try {
      ClixLogger.debug(`Setting project user ID for device: ${deviceId}`);

      const response = await this.apiClient.post(
        `/devices/${deviceId}/user/project-user-id`,
        {
          project_user_id: projectUserId,
        }
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
        );
      }

      ClixLogger.debug(
        `Project user ID set successfully for device: ${deviceId}`
      );
    } catch (error) {
      ClixLogger.error(
        `Failed to set project user ID for device: ${deviceId}`,
        error
      );
      throw error;
    }
  }

  async removeProjectUserId(deviceId: string): Promise<void> {
    try {
      ClixLogger.debug(`Removing project user ID for device: ${deviceId}`);

      const response = await this.apiClient.delete(
        `/devices/${deviceId}/user/project-user-id`
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
        );
      }

      ClixLogger.debug(
        `Project user ID removed successfully for device: ${deviceId}`
      );
    } catch (error) {
      ClixLogger.error(
        `Failed to remove project user ID for device: ${deviceId}`,
        error
      );
      throw error;
    }
  }

  async upsertUserProperties(
    deviceId: string,
    properties: ClixUserProperty[]
  ): Promise<void> {
    try {
      ClixLogger.debug(
        `Upserting ${properties.length} user properties for device: ${deviceId}`
      );

      const response = await this.apiClient.post(
        `/devices/${deviceId}/user/properties`,
        {
          properties: properties.map((p) => ({
            name: p.name,
            value_string: p.valueString,
            type: p.type,
          })),
        }
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
        );
      }

      ClixLogger.debug(
        `User properties upserted successfully for device: ${deviceId}`
      );
    } catch (error) {
      ClixLogger.error(
        `Failed to upsert user properties for device: ${deviceId}`,
        error
      );
      throw error;
    }
  }

  async removeUserProperties(
    deviceId: string,
    propertyNames: string[]
  ): Promise<void> {
    try {
      ClixLogger.debug(
        `Removing ${propertyNames.length} user properties for device: ${deviceId}`
      );

      const response = await this.apiClient.delete(
        `/devices/${deviceId}/user/properties`,
        {
          property_names: propertyNames.join(','),
        }
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
          `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
        );
      }

      ClixLogger.debug(
        `User properties removed successfully for device: ${deviceId}`
      );
    } catch (error) {
      ClixLogger.error(
        `Failed to remove user properties for device: ${deviceId}`,
        error
      );
      throw error;
    }
  }
}
