import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClixLogger } from '../utils/logging/ClixLogger';

export class StorageService {
  private static instance: StorageService | null = null;
  private memoryStorage: Map<string, string> = new Map();
  private isAsyncStorageAvailable: boolean = true;

  constructor() {
    if (StorageService.instance) {
      return StorageService.instance;
    }
    StorageService.instance = this;
    this.checkAsyncStorageAvailability();
  }

  private async checkAsyncStorageAvailability(): Promise<void> {
    try {
      // Test if AsyncStorage is available
      if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
        throw new Error('AsyncStorage is not available');
      }

      // Try a simple operation to verify it works
      await AsyncStorage.getItem('__test_key__');
      this.isAsyncStorageAvailable = true;
    } catch (error) {
      ClixLogger.warn(
        'AsyncStorage is not available, falling back to memory storage',
        error
      );
      this.isAsyncStorageAvailable = false;
    }
  }

  async set<T>(key: string, value: T | null): Promise<void> {
    try {
      if (value === null || value === undefined) {
        if (this.isAsyncStorageAvailable) {
          await AsyncStorage.removeItem(key);
        } else {
          this.memoryStorage.delete(key);
        }
        return;
      }

      const encoded = JSON.stringify(value);

      if (this.isAsyncStorageAvailable) {
        await AsyncStorage.setItem(key, encoded);
      } else {
        this.memoryStorage.set(key, encoded);
      }
    } catch (error) {
      ClixLogger.error(`Failed to set value for key: ${key}`, error);
      // If AsyncStorage fails, try fallback to memory storage
      if (this.isAsyncStorageAvailable) {
        ClixLogger.warn('AsyncStorage failed, falling back to memory storage');
        this.isAsyncStorageAvailable = false;
        const encoded = value ? JSON.stringify(value) : null;
        if (encoded) {
          this.memoryStorage.set(key, encoded);
        } else {
          this.memoryStorage.delete(key);
        }
      } else {
        throw error;
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      let data: string | null = null;

      if (this.isAsyncStorageAvailable) {
        data = await AsyncStorage.getItem(key);
      } else {
        data = this.memoryStorage.get(key) || null;
      }

      if (data === null) return null;

      try {
        const decoded = JSON.parse(data);
        return decoded as T;
      } catch (jsonError) {
        // Handle legacy string values
        ClixLogger.debug(
          `Found legacy string value for key: ${key}, migrating to JSON format`
        );
        await this.set(key, data as any);
        return data as T;
      }
    } catch (error) {
      ClixLogger.error(`Failed to get value for key: ${key}`, error);
      // If AsyncStorage fails, try fallback to memory storage
      if (this.isAsyncStorageAvailable) {
        ClixLogger.warn('AsyncStorage failed, falling back to memory storage');
        this.isAsyncStorageAvailable = false;
        const data = this.memoryStorage.get(key) || null;
        if (data) {
          try {
            return JSON.parse(data) as T;
          } catch {
            return data as T;
          }
        }
      }
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      if (this.isAsyncStorageAvailable) {
        await AsyncStorage.removeItem(key);
      } else {
        this.memoryStorage.delete(key);
      }
    } catch (error) {
      ClixLogger.error(`Failed to remove key: ${key}`, error);
      // If AsyncStorage fails, try fallback to memory storage
      if (this.isAsyncStorageAvailable) {
        ClixLogger.warn('AsyncStorage failed, falling back to memory storage');
        this.isAsyncStorageAvailable = false;
        this.memoryStorage.delete(key);
      } else {
        throw error;
      }
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.isAsyncStorageAvailable) {
        await AsyncStorage.clear();
      } else {
        this.memoryStorage.clear();
      }
    } catch (error) {
      ClixLogger.error('Failed to clear storage', error);
      // If AsyncStorage fails, try fallback to memory storage
      if (this.isAsyncStorageAvailable) {
        ClixLogger.warn('AsyncStorage failed, falling back to memory storage');
        this.isAsyncStorageAvailable = false;
        this.memoryStorage.clear();
      } else {
        throw error;
      }
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (this.isAsyncStorageAvailable) {
        const keys = await AsyncStorage.getAllKeys();
        return Array.from(keys);
      } else {
        return Array.from(this.memoryStorage.keys());
      }
    } catch (error) {
      ClixLogger.error('Failed to get all keys', error);
      // If AsyncStorage fails, try fallback to memory storage
      if (this.isAsyncStorageAvailable) {
        ClixLogger.warn('AsyncStorage failed, falling back to memory storage');
        this.isAsyncStorageAvailable = false;
        return Array.from(this.memoryStorage.keys());
      }
      return [];
    }
  }
}
