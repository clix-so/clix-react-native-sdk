import { ClixLogger } from '../utils/logging/ClixLogger';

// Support both v2/v3 (MMKV class) and v4 (createMMKV function)
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
    try {
      // Try v4 API first (createMMKV)
      const { createMMKV } = require('react-native-mmkv');
      this.storage = createMMKV({
        id: 'clix-storage',
        encryptionKey: undefined, // Add encryption if needed
      });
      ClixLogger.debug('Initialized MMKV storage using v4 API (createMMKV)');
    } catch (error) {
      // Fall back to v2/v3 API (MMKV class)
      try {
        const { MMKV } = require('react-native-mmkv');
        this.storage = new MMKV({
          id: 'clix-storage',
          encryptionKey: undefined, // Add encryption if needed
        });
        ClixLogger.debug(
          'Initialized MMKV storage using v2/v3 API (MMKV class)'
        );
      } catch (fallbackError) {
        ClixLogger.error('Failed to initialize MMKV storage', fallbackError);
        throw fallbackError;
      }
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (value === undefined) {
      try {
        this.deleteKey(key);
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

  async get<T>(key: string): Promise<T | undefined> {
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
        await this.set(key, data);
        return data as T;
      }
    } catch (error) {
      ClixLogger.error(`Failed to get value for key: ${key}`, error);
      // Return undefined instead of throwing to prevent initialization failure
      return undefined;
    }
  }

  /**
   * Delete a key from storage (works with both v2/v3 and v4 APIs)
   */
  private deleteKey(key: string): void {
    // v4 uses remove(), v2/v3 uses delete()
    if (this.storage.remove) {
      this.storage.remove(key);
    } else if (this.storage.delete) {
      this.storage.delete(key);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.deleteKey(key);
    } catch (error) {
      ClixLogger.error(`Failed to remove key: ${key}`, error);
      // Don't throw to prevent initialization failure
      return;
    }
  }

  async clear(): Promise<void> {
    try {
      this.storage.clearAll();
    } catch (error) {
      ClixLogger.error('Failed to clear storage', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const keys = this.storage.getAllKeys();
      return Array.from(keys);
    } catch (error) {
      ClixLogger.error('Failed to get all keys', error);
      return [];
    }
  }
}
