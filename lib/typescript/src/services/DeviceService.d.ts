import { ClixDevice } from '../models/ClixDevice';
import { DeviceAPIService } from './DeviceAPIService';
import { StorageService } from './StorageService';
import type { TokenService } from './TokenService';
export declare class DeviceService {
    private readonly storageService;
    private readonly tokenService;
    private readonly deviceAPIService;
    private deviceIdKey;
    private currentDevice?;
    constructor(storageService: StorageService, tokenService: TokenService, deviceAPIService: DeviceAPIService);
    initialize(): Promise<void>;
    private generateDeviceId;
    getCurrentDeviceId(): string;
    createDevice(): Promise<ClixDevice>;
    upsertDevice(device: ClixDevice): Promise<void>;
    updatePushToken(pushToken: string, pushTokenType: string): Promise<void>;
    updatePushPermission(isGranted: boolean): Promise<void>;
    setProjectUserId(projectUserId: string): Promise<void>;
    removeProjectUserId(): Promise<void>;
    updateUserProperties(properties: Record<string, any>): Promise<void>;
    removeUserProperties(names: string[]): Promise<void>;
    private getPushPermissionStatus;
    private getPushToken;
}
//# sourceMappingURL=DeviceService.d.ts.map