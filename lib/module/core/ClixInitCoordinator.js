"use strict";

import { ClixLogger } from "../utils/logging/ClixLogger.js";
export class ClixInitCoordinator {
  resolve = null;
  reject = null;
  isCompleted = false;
  isFailed = false;
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  async waitForInitialization() {
    if (this.isCompleted) {
      return Promise.resolve();
    }
    if (this.isFailed) {
      return Promise.reject(new Error('Clix initialization has already failed'));
    }
    return this.promise;
  }
  completeInitialization() {
    if (this.isAlreadyFinalized()) {
      return;
    }
    this.isCompleted = true;
    this.resolve?.();
  }
  failInitialization(error) {
    if (this.isAlreadyFinalized()) {
      return;
    }
    this.isFailed = true;
    ClixLogger.warn('Clix initialization failed:', error);
    this.reject?.(error);
  }
  isAlreadyFinalized() {
    if (this.isCompleted || this.isFailed) {
      ClixLogger.warn('Initialization already completed or failed');
      return true;
    }
    return false;
  }
}
//# sourceMappingURL=ClixInitCoordinator.js.map