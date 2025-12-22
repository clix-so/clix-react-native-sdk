"use strict";

import { NativeModules, Platform } from 'react-native';
import { ClixLogger } from "../utils/logging/ClixLogger.js";
const MODULE_NAME = 'ClixAppGroupDirectory';
const resolveModule = () => {
  const nativeModule = NativeModules[MODULE_NAME];
  if (!nativeModule) {
    return undefined;
  }
  return nativeModule;
};
export const getAppGroupDirectory = () => {
  if (Platform.OS !== 'ios') {
    return undefined;
  }
  const nativeModule = resolveModule();
  if (!nativeModule || typeof nativeModule.getAppGroupDirectory !== 'function') {
    ClixLogger.debug('App Group directory native module is unavailable. Falling back to default MMKV path.');
    return undefined;
  }
  try {
    const directory = nativeModule.getAppGroupDirectory();
    if (typeof directory === 'string' && directory.length > 0) {
      return directory;
    }
  } catch (error) {
    ClixLogger.warn('Failed to resolve App Group directory', error);
  }
  return undefined;
};
//# sourceMappingURL=getAppGroupDirectory.js.map