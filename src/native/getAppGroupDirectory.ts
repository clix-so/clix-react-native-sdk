import { NativeModules, Platform } from 'react-native';
import { ClixLogger } from '../utils/logging/ClixLogger';

type ClixAppGroupDirectoryModule = {
  getAppGroupDirectory(): string | null;
};

const MODULE_NAME = 'ClixAppGroupDirectory';

const resolveModule = (): ClixAppGroupDirectoryModule | undefined => {
  const nativeModule = (NativeModules as Record<string, unknown>)[MODULE_NAME];
  if (!nativeModule) {
    return undefined;
  }
  return nativeModule as ClixAppGroupDirectoryModule;
};

export const getAppGroupDirectory = (): string | undefined => {
  if (Platform.OS !== 'ios') {
    return undefined;
  }

  const nativeModule = resolveModule();
  if (
    !nativeModule ||
    typeof nativeModule.getAppGroupDirectory !== 'function'
  ) {
    ClixLogger.debug(
      'App Group directory native module is unavailable. Falling back to default MMKV path.'
    );
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
