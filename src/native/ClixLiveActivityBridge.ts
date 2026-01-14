import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import { ClixLogger } from '../utils/logging/ClixLogger';

const MODULE_NAME = 'ClixLiveActivityModule';

export interface PushToStartTokenEvent {
  activityType: string;
  token: string;
}

type ClixLiveActivityNativeModule = {
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

const resolveModule = (): ClixLiveActivityNativeModule | undefined => {
  if (Platform.OS !== 'ios') {
    return undefined;
  }

  const nativeModule = (NativeModules as Record<string, unknown>)[MODULE_NAME];
  if (!nativeModule) {
    ClixLogger.debug('ClixLiveActivityModule is not available');
    return undefined;
  }
  return nativeModule as ClixLiveActivityNativeModule;
};

let eventEmitter: NativeEventEmitter | undefined;

const getEventEmitter = (): NativeEventEmitter | undefined => {
  if (Platform.OS !== 'ios') {
    return undefined;
  }

  if (!eventEmitter) {
    const nativeModule = resolveModule();
    if (nativeModule) {
      eventEmitter = new NativeEventEmitter(nativeModule as any);
    }
  }
  return eventEmitter;
};

export const subscribeToPushToStartToken = (
  callback: (event: PushToStartTokenEvent) => void
): EmitterSubscription | undefined => {
  const emitter = getEventEmitter();
  if (!emitter) {
    ClixLogger.debug('NativeEventEmitter is not available for LiveActivity');
    return undefined;
  }

  return emitter.addListener('onPushToStartToken', callback);
};
