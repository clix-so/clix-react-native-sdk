"use strict";

export class ClixVersion {
  static fallBackVersion = '0.0.0';
  static async getVersion() {
    if (this.cachedVersion) {
      return this.cachedVersion;
    }
    try {
      this.cachedVersion = require('../../../package.json').version || this.fallBackVersion;
      return this.cachedVersion;
    } catch (error) {
      return '0.0.0';
    }
  }
}
//# sourceMappingURL=ClixVersion.js.map