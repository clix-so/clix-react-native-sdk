import { type NotificationSettings } from '@notifee/react-native';
import type { BackgroundMessageHandler, ForegroundEventHandler, MessageHandler, NotificationOpenedAppHandler, TokenRefreshHandler } from '../services/NotificationService';
interface ConfigureOptions {
    /**
     * @default false
     */
    autoRequestPermission?: boolean;
    /**
     * @default true
     */
    autoHandleLandingURL?: boolean;
}
export declare class ClixNotification {
    static shared: ClixNotification;
    configure(options?: ConfigureOptions): Promise<void>;
    requestPermission(): Promise<NotificationSettings | undefined>;
    setPermissionGranted(isGranted: boolean): Promise<void>;
    getToken(): Promise<string | undefined>;
    onMessage(handler?: MessageHandler): Promise<void>;
    onBackgroundMessage(handler?: BackgroundMessageHandler): Promise<void>;
    onNotificationOpenedApp(handler?: NotificationOpenedAppHandler): Promise<void>;
    onTokenRefresh(handler?: TokenRefreshHandler): Promise<void>;
    onForegroundEvent(handler?: ForegroundEventHandler): Promise<void>;
}
export {};
//# sourceMappingURL=ClixNotification.d.ts.map