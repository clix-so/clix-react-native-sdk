export class ClixVersion {
  private static _cachedVersion: string | null = null;

  static async getVersion(): Promise<string> {
    if (this._cachedVersion !== null) {
      return this._cachedVersion;
    }

    try {
      // In React Native, we can get version from package.json
      // This will be replaced with actual version during build
      const version: string =
        require('../../../package.json').version || '0.0.0';
      this._cachedVersion = version;
      return this._cachedVersion;
    } catch (error) {
      return '0.0.0';
    }
  }

  static get version(): string {
    return this._cachedVersion || '0.0.0';
  }
}
