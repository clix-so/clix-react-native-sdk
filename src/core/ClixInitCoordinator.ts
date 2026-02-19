import { ClixLogger } from '../utils/logging/ClixLogger';

export class ClixInitCoordinator {
  private promise: Promise<void>;
  private resolve: (() => void) | null = null;
  private reject: ((error: Error) => void) | null = null;
  private isCompleted = false;
  private isFailed = false;

  constructor() {
    this.promise = new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  async waitForInitialization(): Promise<void> {
    if (this.isCompleted) {
      return Promise.resolve();
    }
    if (this.isFailed) {
      return Promise.reject(
        new Error('Clix initialization has already failed')
      );
    }
    return this.promise;
  }

  completeInitialization(): void {
    if (this.isAlreadyFinalized()) {
      return;
    }
    this.isCompleted = true;
    this.resolve?.();
  }

  failInitialization(error: Error): void {
    if (this.isAlreadyFinalized()) {
      return;
    }
    this.isFailed = true;
    ClixLogger.warn('Clix initialization failed:', error);
    this.reject?.(error);
  }

  reset(): void {
    this.isCompleted = false;
    this.isFailed = false;
    this.promise = new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  private isAlreadyFinalized(): boolean {
    if (this.isCompleted || this.isFailed) {
      ClixLogger.warn('Initialization already completed or failed');
      return true;
    }
    return false;
  }
}
