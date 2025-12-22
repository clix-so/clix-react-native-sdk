import { DeviceService } from '../services/DeviceService';
import { EventService } from '../services/EventService';
import { NotificationService } from '../services/NotificationService';
import { StorageService } from '../services/StorageService';
import { TokenService } from '../services/TokenService';
import { ClixLogLevel } from '../utils/logging/ClixLogger';
import type { PickPartial, Prettify } from '../utils/types';
import type { ClixConfig } from './ClixConfig';
import { ClixInitCoordinator } from './ClixInitCoordinator';
import { ClixNotification } from './ClixNotification';
type ClixInitializeOptions = Prettify<PickPartial<ClixConfig, 'endpoint' | 'logLevel' | 'extraHeaders'>>;
export declare class Clix {
    static shared?: Clix;
    static initCoordinator: ClixInitCoordinator;
    static Notification: ClixNotification;
    config?: ClixConfig;
    storageService?: StorageService;
    tokenService?: TokenService;
    eventService?: EventService;
    deviceService?: DeviceService;
    notificationService?: NotificationService;
    private static configKey;
    /**
     * Initialize Clix SDK
     */
    static initialize(options: ClixInitializeOptions): Promise<void>;
    /**
     * Set user ID
     */
    static setUserId(userId: string): Promise<void>;
    /**
     * Remove user ID
     */
    static removeUserId(): Promise<void>;
    /**
     * Set user property
     */
    static setUserProperty(key: string, value: any): Promise<void>;
    /**
     * Set user properties
     */
    static setUserProperties(properties: Record<string, any>): Promise<void>;
    /**
     * Remove user property
     */
    static removeUserProperty(key: string): Promise<void>;
    /**
     * Remove user properties
     */
    static removeUserProperties(keys: string[]): Promise<void>;
    /**
     * Track event
     */
    static trackEvent(name: string, properties?: Record<string, any>): Promise<void>;
    /**
     * Set log level
     */
    static setLogLevel(level: ClixLogLevel): void;
    /**
     * Get device ID
     */
    static getDeviceId(): Promise<string | undefined>;
}
export {};
//# sourceMappingURL=Clix.d.ts.map