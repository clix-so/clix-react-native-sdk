import { ClixLogger } from '../utils/logging/ClixLogger';
import { StorageService } from './StorageService';

export class TokenService {
  private static readonly CURRENT_TOKEN_KEY = 'clix_current_push_token';
  private static readonly PREVIOUS_TOKENS_KEY = 'clix_push_tokens';
  private static readonly MAX_TOKENS = 5;

  constructor(private readonly storageService: StorageService) {}

  getCurrentToken(): string | undefined {
    try {
      return this.storageService.get<string>(TokenService.CURRENT_TOKEN_KEY);
    } catch (error) {
      ClixLogger.error('Failed to get current token', error);
      return undefined;
    }
  }

  getPreviousTokens(): string[] {
    try {
      const result = this.storageService.get<string[]>(
        TokenService.PREVIOUS_TOKENS_KEY
      );
      if (result === undefined) return [];

      return Array.isArray(result) ? result : [];
    } catch (error) {
      ClixLogger.error('Failed to get previous tokens', error);
      return [];
    }
  }

  saveToken(token: string) {
    try {
      this.storageService.set(TokenService.CURRENT_TOKEN_KEY, token);

      let tokens = this.getPreviousTokens();

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

      this.storageService.set(TokenService.PREVIOUS_TOKENS_KEY, tokens);
      ClixLogger.debug('Token saved successfully');
    } catch (error) {
      ClixLogger.error('Failed to save token', error);
      throw error;
    }
  }

  clearTokens() {
    try {
      this.storageService.remove(TokenService.PREVIOUS_TOKENS_KEY);
      this.storageService.remove(TokenService.CURRENT_TOKEN_KEY);
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

  reset() {
    this.clearTokens();
  }
}
