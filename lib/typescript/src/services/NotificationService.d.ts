import { type Event, type NotificationSettings } from '@notifee/react-native';
import { DeviceService } from './DeviceService';
import { EventService } from './EventService';
import { TokenService } from './TokenService';
type NotificationData = Record<string, any>;
export type MessageHandler = (data: NotificationData) => Promise<boolean> | boolean;
export type BackgroundMessageHandler = (data: NotificationData) => Promise<void> | void;
export type NotificationOpenedAppHandler = (data: NotificationData) => Promise<void> | void;
export type TokenRefreshHandler = (token: string) => Promise<void> | void;
export type ForegroundEventHandler = (event: Event) => Promise<void> | void;
export declare class NotificationService {
    private readonly deviceService;
    private readonly tokenService;
    private readonly eventService;
    autoHandleLandingUrl: boolean;
    messageHandler?: MessageHandler;
    backgroundMessageHandler?: BackgroundMessageHandler;
    notificationOpenedAppHandler?: NotificationOpenedAppHandler;
    tokenRefreshHandler?: TokenRefreshHandler;
    foregroundEventHandler?: ForegroundEventHandler;
    private isInitialized;
    private processedMessageIds;
    private unsubscribeMessage?;
    private unsubscribeNotificationOpenedApp?;
    private unsubscribeTokenRefresh?;
    private unsubscribeForegroundEvent?;
    private static readonly DEFAULT_CHANNEL;
    private static readonly ANDROID_GROUP_ID;
    constructor(deviceService: DeviceService, tokenService: TokenService, eventService: EventService);
    initialize(): Promise<void>;
    cleanup(): void;
    requestPermission(): Promise<NotificationSettings>;
    setPermissionGranted(isGranted: boolean): Promise<void>;
    private setupPushReceivedHandler;
    private setupPushTappedHandler;
    private setupTokenRefreshListener;
    private createNotificationChannels;
    /**
     * Android: background message handler
     */
    private handleBackgroundMessage;
    /**
     * iOS & Android: foreground message handler
     */
    private handleForegroundMessage;
    /**
     * iOS: background notification tap handler
     */
    private handleNotificationOpenedApp;
    /**
     * iOS: app launched from a quit state via a notification
     */
    private handleInitialNotification;
    /**
     * Android: background notification tap handler
     */
    private handleNotificationEvent;
    /**
     * iOS & Android: foreground notification tap handler
     */
    private handleForegroundNotificationEvent;
    private trackPushReceivedEvent;
    private trackPushTappedEvent;
    private displayNotification;
    private createNotificationConfig;
    private handleUrlNavigation;
    private parseClixPayload;
}
export {};
//# sourceMappingURL=NotificationService.d.ts.map