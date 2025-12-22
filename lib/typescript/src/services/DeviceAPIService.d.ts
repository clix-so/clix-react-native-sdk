import { ClixDevice } from '../models/ClixDevice';
import { ClixUserProperty } from '../models/ClixUserProperty';
import { ClixAPIClient } from './ClixAPIClient';
export declare class DeviceAPIService {
    private readonly apiClient;
    constructor(apiClient: ClixAPIClient);
    upsertDevice(device: ClixDevice): Promise<void>;
    setProjectUserId(deviceId: string, projectUserId: string): Promise<void>;
    removeProjectUserId(deviceId: string): Promise<void>;
    upsertUserProperties(deviceId: string, properties: ClixUserProperty[]): Promise<void>;
    removeUserProperties(deviceId: string, propertyNames: string[]): Promise<void>;
}
//# sourceMappingURL=DeviceAPIService.d.ts.map