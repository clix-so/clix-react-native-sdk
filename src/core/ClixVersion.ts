export class ClixVersion {
  private static cachedVersion?: string;
  private static fallBackVersion: string = '0.0.0';

  static async getVersion(): Promise<string> {
    if (this.cachedVersion) {
      return this.cachedVersion;
    }
    try {
      this.cachedVersion =
        require('../../../package.json').version || this.fallBackVersion;
      return this.cachedVersion!;
    } catch (error) {
      return '0.0.0';
    }
  }
}
