import { ClixLogger } from '../utils/logging/ClixLogger';
import { StorageService } from './StorageService';

export class TokenService {
  private static readonly CURRENT_TOKEN_KEY = 'clix_current_push_token';
  private static readonly PREVIOUS_TOKENS_KEY = 'clix_push_tokens';
  private static readonly MAX_TOKENS = 5;

  constructor(private readonly storageService: StorageService) {}

  async getCurrentToken(): Promise<string | undefined> {
    try {
      return await this.storageService.get<string>(
        TokenService.CURRENT_TOKEN_KEY
      );
    } catch (error) {
      ClixLogger.error('Failed to get current token', error);
      return undefined;
    }
  }

  async getPreviousTokens(): Promise<string[]> {
    try {
      const result = await this.storageService.get<string[]>(
        TokenService.PREVIOUS_TOKENS_KEY
      );
      if (result === undefined) return [];

      return Array.isArray(result) ? result : [];
    } catch (error) {
      ClixLogger.error('Failed to get previous tokens', error);
      return [];
    }
  }

  async saveToken(token: string): Promise<void> {
    try {
      await this.storageService.set(TokenService.CURRENT_TOKEN_KEY, token);

      let tokens = await this.getPreviousTokens();

      // Remove existing token if present
      const currentIndex = tokens.indexOf(token);
      if (currentIndex !== -1) {
        tokens.splice(currentIndex, 1);
      }

      // Add new token
      tokens.push(token);

      // Keep only the last MAX_TOKENS
      if (tokens.length > TokenService.MAX_TOKENS) {
        tokens = tokens.slice(-TokenService.MAX_TOKENS);
      }

      await this.storageService.set(TokenService.PREVIOUS_TOKENS_KEY, tokens);
      ClixLogger.debug('Token saved successfully');
    } catch (error) {
      ClixLogger.error('Failed to save token', error);
      throw error;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await this.storageService.remove(TokenService.PREVIOUS_TOKENS_KEY);
      await this.storageService.remove(TokenService.CURRENT_TOKEN_KEY);
      ClixLogger.debug('All tokens cleared');
    } catch (error) {
      ClixLogger.error('Failed to clear tokens', error);
      throw error;
    }
  }

  convertTokenToString(deviceToken: number[]): string {
    return deviceToken
      .map((data) => data.toString(16).padStart(2, '0'))
      .join('');
  }

  async reset(): Promise<void> {
    await this.clearTokens();
  }
}
