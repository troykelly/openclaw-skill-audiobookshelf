/**
 * Sleep timer with progress sync
 */
/**
 * Sleep timer that syncs progress before pausing
 */
export class SleepTimer {
    timeoutId = null;
    endTime = null;
    totalMinutes = null;
    options;
    constructor(options) {
        this.options = {
            checkInterval: 1000,
            ...options,
        };
    }
    /**
     * Set sleep timer for N minutes
     * @param minutes - Duration in minutes (must be > 0)
     * @throws Error if minutes <= 0
     */
    start(minutes) {
        if (minutes <= 0) {
            throw new Error('Sleep timer duration must be greater than 0');
        }
        this.cancel();
        this.totalMinutes = minutes;
        this.endTime = Date.now() + minutes * 60 * 1000;
        this.timeoutId = setTimeout(() => {
            void this.expire();
        }, minutes * 60 * 1000);
    }
    /**
     * Cancel the current timer
     */
    cancel() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.endTime = null;
        this.totalMinutes = null;
    }
    /**
     * Get remaining time in seconds
     * @returns Remaining seconds, or 0 if no timer is active
     */
    getRemainingSeconds() {
        if (!this.endTime)
            return 0;
        const remaining = Math.max(0, this.endTime - Date.now());
        return Math.ceil(remaining / 1000);
    }
    /**
     * Check if timer is active
     */
    isActive() {
        return this.endTime !== null;
    }
    /**
     * Get timer status
     */
    getStatus() {
        return {
            active: this.isActive(),
            remainingSeconds: this.getRemainingSeconds(),
            totalMinutes: this.totalMinutes ?? undefined,
        };
    }
    /**
     * Extend the current timer by additional minutes
     * @param minutes - Additional minutes to add
     * @throws Error if no timer is active
     */
    extend(minutes) {
        if (!this.isActive() || !this.endTime) {
            throw new Error('No active timer to extend');
        }
        const additionalMs = minutes * 60 * 1000;
        this.endTime += additionalMs;
        if (this.totalMinutes !== null) {
            this.totalMinutes += minutes;
        }
        // Reset the timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        const remaining = this.endTime - Date.now();
        this.timeoutId = setTimeout(() => {
            void this.expire();
        }, remaining);
    }
    async expire() {
        try {
            // Sync progress first
            await this.options.onSyncProgress();
        }
        catch {
            // Continue to expire even if sync fails
            // Error is intentionally swallowed to ensure onExpire is called
        }
        try {
            // Then pause/stop
            await this.options.onExpire();
        }
        finally {
            // Always clean up timer state
            this.endTime = null;
            this.totalMinutes = null;
            this.timeoutId = null;
        }
    }
}
//# sourceMappingURL=sleep-timer.js.map