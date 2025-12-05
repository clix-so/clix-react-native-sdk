export class ClixDevice {
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
}
