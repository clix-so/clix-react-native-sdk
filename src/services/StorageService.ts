import { MMKV } from 'react-native-mmkv';
import { ClixLogger } from '../utils/logging/ClixLogger';

export class StorageService {
  private storage: MMKV;

  constructor() {
    this.storage = new MMKV({
      id: 'clix-storage',
      encryptionKey: undefined, // Add encryption if needed
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (value === undefined) {
      try {
        this.storage.delete(key);
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

  async remove(key: string): Promise<void> {
    try {
      this.storage.delete(key);
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
