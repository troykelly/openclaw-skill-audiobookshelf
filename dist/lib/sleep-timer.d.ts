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
export interface SleepTimerStatus {
    active: boolean;
    remainingSeconds: number;
    totalMinutes?: number;
}
/**
 * Sleep timer that syncs progress before pausing
 */
export declare class SleepTimer {
    private timeoutId;
    private endTime;
    private totalMinutes;
    private readonly options;
    constructor(options: SleepTimerOptions);
    /**
     * Set sleep timer for N minutes
     * @param minutes - Duration in minutes (must be > 0)
     * @throws Error if minutes <= 0
     */
    start(minutes: number): void;
    /**
     * Cancel the current timer
     */
    cancel(): void;
    /**
     * Get remaining time in seconds
     * @returns Remaining seconds, or 0 if no timer is active
     */
    getRemainingSeconds(): number;
    /**
     * Check if timer is active
     */
    isActive(): boolean;
    /**
     * Get timer status
     */
    getStatus(): SleepTimerStatus;
    /**
     * Extend the current timer by additional minutes
     * @param minutes - Additional minutes to add
     * @throws Error if no timer is active
     */
    extend(minutes: number): void;
    private expire;
}
//# sourceMappingURL=sleep-timer.d.ts.map