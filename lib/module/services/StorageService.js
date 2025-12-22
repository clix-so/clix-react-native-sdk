"use strict";

import * as MMKVModule from 'react-native-mmkv';
import { getAppGroupDirectory } from "../native/getAppGroupDirectory.js";
import { ClixLogger } from "../utils/logging/ClixLogger.js";

// Support both v2/v3 (MMKV class) and v4 (createMMKV function)

export class StorageService {
  constructor(projectId) {
    this.storage = this.initializeCompat(projectId);
  }
  getStoragePath() {
    try {
      const directory = getAppGroupDirectory();
      if (!directory) {
        return undefined;
      }

      /**
       * NOTE(nyanxyz):
       * On iOS the mmkv directory is located at {App Group Directory}/mmkv.
       * RN MMKV v2 used {App Group Directory}/mmkv, but v3 switched to {App Group Directory}.
       * We need to keep the directory aligned so iOS and RN can share storage.
       * Therefore we explicitly target the mmkv folder inside the App Group directory.
       * @see https://akshayjadhav.hashnode.dev/how-to-access-react-native-mmkv-in-a-ios-widget-react-native-expo
       */
      return `${directory}/mmkv`;
    } catch (error) {
      ClixLogger.warn('Failed to resolve App Group directory', error);
      return undefined;
    }
  }
  initializeCompat(projectId) {
    const storageId = `clix.${projectId}`;

    // v4 API (createMMKV function)
    if (typeof MMKVModule.createMMKV === 'function') {
      return MMKVModule.createMMKV({
        id: storageId,
        encryptionKey: undefined,
        // Add encryption if needed
        path: this.getStoragePath(),
        mode: 'multi-process'
      });
    }
    // v2/v3 API (MMKV class)
    else if (typeof MMKVModule.MMKV === 'function') {
      const {
        MMKV
      } = MMKVModule;
      return new MMKV({
        id: storageId,
        encryptionKey: undefined,
        // Add encryption if needed
        path: this.getStoragePath(),
        mode: 'multi-process'
      });
    } else {
      throw new Error('No compatible MMKV storage API found');
    }
  }

  /**
   * Delete a key from storage (works with both v2/v3 and v4 APIs)
   */
  removeCompat(key) {
    // v4 uses remove(), v2/v3 uses delete()
    if (typeof this.storage.remove === 'function') {
      this.storage.remove(key);
    } else if (typeof this.storage.delete === 'function') {
      this.storage.delete(key);
    } else {
      throw new Error('No compatible delete method found on storage instance');
    }
  }
  set(key, value) {
    if (value === undefined || value === null) {
      try {
        this.removeCompat(key);
      } catch (error) {
        ClixLogger.error(`Failed to remove value for key: ${key}`, error);
      }
      return;
    }
    try {
      const encoded = JSON.stringify(value);
      this.storage.set(key, encoded);
    } catch (error) {
      ClixLogger.error(`Failed to set value for key: ${key}`, error);
      // Don't throw storage errors to prevent initialization failure
      return;
    }
  }
  get(key) {
    try {
      const data = this.storage.getString(key);
      if (data === null || data === undefined) return undefined;
      try {
        const decoded = JSON.parse(data);
        return decoded;
      } catch (jsonError) {
        // Handle legacy string values
        ClixLogger.debug(`Found legacy string value for key: ${key}, migrating to JSON format`);
        this.set(key, data);
        return data;
      }
    } catch (error) {
      ClixLogger.error(`Failed to get value for key: ${key}`, error);
      // Return undefined instead of throwing to prevent initialization failure
      return undefined;
    }
  }
  remove(key) {
    try {
      this.removeCompat(key);
    } catch (error) {
      ClixLogger.error(`Failed to remove key: ${key}`, error);
      // Don't throw to prevent initialization failure
      return;
    }
  }
  clear() {
    try {
      this.storage.clearAll();
    } catch (error) {
      ClixLogger.error('Failed to clear storage', error);
      throw error;
    }
  }
  getAllKeys() {
    try {
      const keys = this.storage.getAllKeys();
      return Array.from(keys);
    } catch (error) {
      ClixLogger.error('Failed to get all keys', error);
      return [];
    }
  }
}
//# sourceMappingURL=StorageService.js.map