export class ClixDevice {
  public readonly id: string;
  public readonly platform: string;
  public readonly model: string;
  public readonly manufacturer: string;
  public readonly osName: string;
  public readonly osVersion: string;
  public readonly localeRegion: string;
  public readonly localeLanguage: string;
  public readonly timezone: string;
  public readonly appName: string;
  public readonly appVersion: string;
  public readonly sdkType: string;
  public readonly sdkVersion: string;
  public readonly adId?: string;
  public readonly isPushPermissionGranted: boolean;
  public readonly pushToken?: string;
  public readonly pushTokenType?: string;

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
  }) {
    this.id = device.id;
    this.platform = device.platform;
    this.model = device.model;
    this.manufacturer = device.manufacturer;
    this.osName = device.osName;
    this.osVersion = device.osVersion;
    this.localeRegion = device.localeRegion;
    this.localeLanguage = device.localeLanguage;
    this.timezone = device.timezone;
    this.appName = device.appName;
    this.appVersion = device.appVersion;
    this.sdkType = device.sdkType;
    this.sdkVersion = device.sdkVersion;
    this.adId = device.adId;
    this.isPushPermissionGranted = device.isPushPermissionGranted;
    this.pushToken = device.pushToken;
    this.pushTokenType = device.pushTokenType;
  }

  copyWith(updates: Partial<ClixDevice>): ClixDevice {
    return new ClixDevice({
      id: updates.id ?? this.id,
      platform: updates.platform ?? this.platform,
      model: updates.model ?? this.model,
      manufacturer: updates.manufacturer ?? this.manufacturer,
      osName: updates.osName ?? this.osName,
      osVersion: updates.osVersion ?? this.osVersion,
      localeRegion: updates.localeRegion ?? this.localeRegion,
      localeLanguage: updates.localeLanguage ?? this.localeLanguage,
      timezone: updates.timezone ?? this.timezone,
      appName: updates.appName ?? this.appName,
      appVersion: updates.appVersion ?? this.appVersion,
      sdkType: updates.sdkType ?? this.sdkType,
      sdkVersion: updates.sdkVersion ?? this.sdkVersion,
      adId: updates.adId ?? this.adId,
      isPushPermissionGranted:
        updates.isPushPermissionGranted ?? this.isPushPermissionGranted,
      pushToken: updates.pushToken ?? this.pushToken,
      pushTokenType: updates.pushTokenType ?? this.pushTokenType,
    });
  }

  equals(other: ClixDevice): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return `ClixDevice(id: ${this.id}, platform: ${this.platform}, model: ${this.model})`;
  }
}
