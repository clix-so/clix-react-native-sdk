export declare class ClixDevice {
    readonly id: string;
    readonly platform: string;
    readonly model: string;
    readonly manufacturer: string;
    readonly osName: string;
    readonly osVersion: string;
    readonly localeRegion: string;
    readonly localeLanguage: string;
    readonly timezone: string;
    readonly appName: string;
    readonly appVersion: string;
    readonly sdkType: string;
    readonly sdkVersion: string;
    readonly adId?: string;
    readonly isPushPermissionGranted: boolean;
    readonly pushToken?: string;
    readonly pushTokenType?: string;
    constructor(device: {
        id: string;
        platform: string;
        model: string;
        manufacturer: string;
        osName: string;
        osVersion: string;
        localeRegion: string;
        localeLanguage: string;
        timezone: string;
        appName: string;
        appVersion: string;
        sdkType: string;
        sdkVersion: string;
        adId?: string;
        isPushPermissionGranted: boolean;
        pushToken?: string;
        pushTokenType?: string;
    });
    copyWith(updates: Partial<ClixDevice>): ClixDevice;
}
//# sourceMappingURL=ClixDevice.d.ts.map