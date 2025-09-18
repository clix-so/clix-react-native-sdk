import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { ClixLogger } from './logging/ClixLogger';

export class UUID {
  /**
   * Generates a new UUID v4
   * @returns A new UUID string
   */
  static generate(): string {
    try {
      return uuidv4();
    } catch (error) {
      ClixLogger.warn(
        'UUID generation failed, using fallback ID generation',
        error
      );
      return this.generateFallbackId();
    }
  }

  /**
   * Generates a fallback ID when UUID generation fails
   * @returns A fallback ID string
   */
  private static generateFallbackId(): string {
    return `clix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
