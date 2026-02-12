import { AppState, type AppStateStatus } from 'react-native';
import { ClixLogger } from '../utils/logging/ClixLogger';
import type { EventService } from './EventService';
import type { StorageService } from './StorageService';

enum SessionEvent {
  SESSION_START = 'SESSION_START',
}

export class SessionService {
  private static readonly LAST_ACTIVITY_KEY = 'clix_session_last_activity';

  private pendingMessageId?: string;
  private readonly effectiveTimeoutMs: number;
  private appStateSubscription?: { remove: () => void };
  private lastAppState: AppStateStatus;

  constructor(
    private readonly storageService: StorageService,
    private readonly eventService: EventService,
    sessionTimeoutMs: number
  ) {
    this.effectiveTimeoutMs = Math.max(sessionTimeoutMs, 5000);
    this.lastAppState = AppState.currentState;
  }

  async start(): Promise<void> {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    const lastActivity = this.storageService.get<number>(
      SessionService.LAST_ACTIVITY_KEY
    );
    if (lastActivity) {
      const elapsed = Date.now() - lastActivity;
      if (elapsed <= this.effectiveTimeoutMs) {
        this.pendingMessageId = undefined;
        this.updateLastActivity();
        ClixLogger.debug('Continuing existing session');
        return;
      }
    }
    await this.startNewSession();
  }

  private async handleAppStateChange(
    nextAppState: AppStateStatus
  ): Promise<void> {
    if (this.lastAppState === 'background' && nextAppState === 'active') {
      // Small delay to allow notification tap handlers to set pendingMessageId
      await new Promise((resolve) => setTimeout(resolve, 100));

      const lastActivity = this.storageService.get<number>(
        SessionService.LAST_ACTIVITY_KEY
      );
      if (lastActivity) {
        const elapsed = Date.now() - lastActivity;
        if (elapsed <= this.effectiveTimeoutMs) {
          this.pendingMessageId = undefined;
          this.updateLastActivity();
          this.lastAppState = nextAppState;
          return;
        }
      }
      await this.startNewSession();
    } else if (nextAppState === 'background') {
      this.updateLastActivity();
    }
    this.lastAppState = nextAppState;
  }

  setPendingMessageId(messageId?: string): void {
    this.pendingMessageId = messageId;
  }

  private async startNewSession(): Promise<void> {
    const messageId = this.pendingMessageId;
    this.pendingMessageId = undefined;
    this.updateLastActivity();

    try {
      await this.eventService.trackEvent(
        SessionEvent.SESSION_START,
        {},
        messageId
      );
      ClixLogger.debug(`${SessionEvent.SESSION_START} tracked`);
    } catch (error) {
      ClixLogger.error(`Failed to track ${SessionEvent.SESSION_START}`, error);
    }
  }

  private updateLastActivity(): void {
    this.storageService.set(SessionService.LAST_ACTIVITY_KEY, Date.now());
  }

  cleanup(): void {
    this.appStateSubscription?.remove();
  }
}
