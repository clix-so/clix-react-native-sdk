import * as MMKVModule from 'react-native-mmkv';
import { ClixLogger } from '../utils/logging/ClixLogger';

// // Support both v2/v3 (MMKV class) and v4 (createMMKV function)
type MMKVInstance = {
  set: (key: string, value: string | number | boolean) => void;
  getString: (key: string) => string | undefined;
  delete?: (key: string) => void; // v2/v3
  remove?: (key: string) => void; // v4
  clearAll: () => void;
  getAllKeys: () => string[];
};

export class StorageService {
  private storage: MMKVInstance;

  constructor() {
    this.storage = this.initializeCompat();
  }

  private initializeCompat() {
    // v4 API (createMMKV function)
    if (typeof MMKVModule.createMMKV === 'function') {
      return MMKVModule.createMMKV({
        id: 'clix-storage',
        encryptionKey: undefined, // Add encryption if needed
      });
    }
    // v2/v3 API (MMKV class)
    else if (typeof (MMKVModule as any).MMKV === 'function') {
      const { MMKV } = MMKVModule as any;
      return new MMKV({
        id: 'clix-storage',
        encryptionKey: undefined, // Add encryption if needed
      });
    } else {
      throw new Error('No compatible MMKV storage API found');
    }
  }

  /**
   * Delete a key from storage (works with both v2/v3 and v4 APIs)
   */
  private removeCompat(key: string): void {
    // v4 uses remove(), v2/v3 uses delete()
    if (typeof this.storage.remove === 'function') {
      this.storage.remove(key);
    } else if (typeof this.storage.delete === 'function') {
      this.storage.delete(key);
    } else {
      throw new Error('No compatible delete method found on storage instance');
    }
  }

  set<T>(key: string, value: T): void {
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

  get<T>(key: string): T | undefined {
    try {
      const data = this.storage.getString(key);
      if (data === null || data === undefined) return undefined;

      try {
        const decoded = JSON.parse(data);
        return decoded as T;
      } catch (jsonError) {
        // Handle legacy string values
        ClixLogger.debug(
          `Found legacy string value for key: ${key}, migrating to JSON format`
        );
        this.set(key, data);
        return data as T;
      }
    } catch (error) {
      ClixLogger.error(`Failed to get value for key: ${key}`, error);
      // Return undefined instead of throwing to prevent initialization failure
      return undefined;
    }
  }

  remove(key: string) {
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
