/**
 * Sleep timer with progress sync
 */

export interface SleepTimerOptions {
  /** Callback when timer expires */
  onExpire: () => Promise<void>;
  /** Callback to sync progress before pausing */
  onSyncProgress: () => Promise<void>;
  /** How often to check timer (ms, default: 1000) */
  checkInterval?: number;
}

/**
 * Sleep timer that syncs progress before pausing
 */
export class SleepTimer {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private endTime: number | null = null;
  private readonly options: Required<SleepTimerOptions>;

  constructor(options: SleepTimerOptions) {
    this.options = {
      checkInterval: 1000,
      ...options,
    };
  }

  /**
   * Set sleep timer for N minutes
   */
  start(minutes: number): void {
    this.cancel();
    this.endTime = Date.now() + minutes * 60 * 1000;

    this.timeoutId = setTimeout(
      () => {
        void this.expire();
      },
      minutes * 60 * 1000
    );
  }

  /**
   * Cancel the current timer
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.endTime = null;
  }

  /**
   * Get remaining time in seconds, or null if no timer
   */
  getRemainingSeconds(): number | null {
    if (!this.endTime) return null;
    const remaining = Math.max(0, this.endTime - Date.now());
    return Math.ceil(remaining / 1000);
  }

  /**
   * Check if timer is active
   */
  isActive(): boolean {
    return this.endTime !== null;
  }

  private async expire(): Promise<void> {
    // Sync progress first
    await this.options.onSyncProgress();
    // Then pause/stop
    await this.options.onExpire();
    this.cancel();
  }
}
