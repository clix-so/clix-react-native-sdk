import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClixLogger } from '../utils/logging/ClixLogger';

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (value === undefined) {
        await AsyncStorage.removeItem(key);
        return;
      }
      const encoded = JSON.stringify(value);
      await AsyncStorage.setItem(key, encoded);
    } catch (error) {
      ClixLogger.error(`Failed to set value for key: ${key}`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data === null || data === undefined) return undefined;
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
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      ClixLogger.error(`Failed to remove key: ${key}`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      ClixLogger.error('Failed to clear storage', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return Array.from(keys);
    } catch (error) {
      ClixLogger.error('Failed to get all keys', error);
      return [];
    }
  }
}
