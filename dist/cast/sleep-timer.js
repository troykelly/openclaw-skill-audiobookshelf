/**
 * Cast Sleep Timer with Fade-out
 *
 * Skill-managed sleep timer with countdown, silent volume fade-out via audio proxy,
 * and position preservation. The Cast device volume is never touched — fade happens
 * in the PCM stream via the VolumeTransform.
 *
 * Architecture:
 * Timer countdown → Poll position → Fade volume (via proxy) → Pause Cast → Sync final position
 */
import { fadeOut } from '../proxy/fade.js';
import { PlayerState } from './types.js';
/**
 * Sleep timer that integrates with audio proxy for silent volume fades.
 *
 * Uses the VolumeTransform's PCM volume control for completely silent fades -
 * no Cast "bloop" sounds. Position is tracked during countdown and synced
 * to Audiobookshelf before completion.
 */
export class CastSleepTimer {
    castClient;
    volumeTransform;
    options;
    fadeDurationMs;
    fadeSteps;
    syncIntervalMs;
    latencyCompensationMs;
    onProgress;
    onPositionSync;
    onComplete;
    onError;
    phase = 'inactive';
    startTime = 0;
    endTime = 0;
    lastPosition = 0;
    countdownInterval;
    syncInterval;
    countdownTimeout;
    abortController;
    runPromiseResolve;
    /**
     * Create a new CastSleepTimer
     *
     * @param castClient - The Cast client for pause/status
     * @param volumeTransform - The VolumeTransform for fade control
     * @param options - Timer options
     */
    constructor(castClient, volumeTransform, options) {
        this.castClient = castClient;
        this.volumeTransform = volumeTransform;
        this.options = options;
        this.fadeDurationMs = options.fadeDurationMs ?? 30000;
        this.fadeSteps = options.fadeSteps ?? 30;
        this.syncIntervalMs = options.syncIntervalMs ?? 10000;
        this.latencyCompensationMs = options.latencyCompensationMs ?? 2000;
        this.onProgress = options.onProgress;
        this.onPositionSync = options.onPositionSync;
        this.onComplete = options.onComplete;
        this.onError = options.onError;
    }
    /**
     * Start the sleep timer
     *
     * @throws Error if already running
     * @returns Promise that resolves when timer completes or is cancelled
     */
    async start() {
        if (this.phase !== 'inactive') {
            throw new Error('Sleep timer is already running');
        }
        this.phase = 'countdown';
        this.startTime = Date.now();
        // Account for latency: start fade slightly early
        this.endTime = this.startTime + this.options.durationMs - this.latencyCompensationMs;
        this.abortController = new AbortController();
        // Start position polling
        await this.pollPosition();
        this.syncInterval = setInterval(() => {
            void this.pollPosition();
        }, this.syncIntervalMs);
        // Start progress reporting
        this.countdownInterval = setInterval(() => {
            this.reportProgress();
        }, 1000);
        // Schedule fade
        const timeUntilFade = Math.max(0, this.endTime - Date.now());
        this.countdownTimeout = setTimeout(() => {
            void this.executeStop();
        }, timeUntilFade);
        // Return a promise that resolves when complete or cancelled
        return new Promise((resolve) => {
            this.runPromiseResolve = resolve;
        });
    }
    /**
     * Cancel the sleep timer
     *
     * @returns Last known playback position (seconds)
     */
    cancel() {
        const position = this.lastPosition;
        // Abort any in-progress fade
        this.abortController?.abort();
        this.cleanup();
        return position;
    }
    /**
     * Get current tracked playback position
     *
     * @returns Position in seconds
     */
    getPosition() {
        return this.lastPosition;
    }
    /**
     * Get remaining time until fade starts
     *
     * @returns Remaining milliseconds, or 0 if inactive
     */
    getRemainingMs() {
        if (this.phase === 'inactive') {
            return 0;
        }
        return Math.max(0, this.endTime - Date.now());
    }
    /**
     * Check if timer is active
     */
    isActive() {
        return this.phase !== 'inactive';
    }
    /**
     * Get full timer state
     */
    getState() {
        return {
            active: this.phase !== 'inactive',
            phase: this.phase,
            remainingMs: this.getRemainingMs(),
            position: this.lastPosition,
            totalDurationMs: this.options.durationMs,
            fadeDurationMs: this.fadeDurationMs,
        };
    }
    /**
     * Poll Cast client for current position
     */
    async pollPosition() {
        if (this.phase === 'inactive') {
            return;
        }
        try {
            // Check connection first
            if (!this.castClient.isConnected()) {
                throw new Error('Cast client not connected');
            }
            const status = await this.castClient.getStatus();
            if (!status) {
                return;
            }
            // Handle playback ending naturally
            if (status.playerState === PlayerState.IDLE) {
                this.handlePlaybackEnded();
                return;
            }
            // Update position
            this.lastPosition = status.currentTime;
            // Sync position to callback
            if (this.onPositionSync) {
                await this.onPositionSync(this.lastPosition);
            }
        }
        catch (error) {
            // Connection lost or other error
            const err = error instanceof Error ? error : new Error(String(error));
            this.handleError(err);
        }
    }
    /**
     * Report progress to callback
     */
    reportProgress() {
        if (this.phase !== 'countdown') {
            return;
        }
        const remaining = this.getRemainingMs();
        this.onProgress?.(remaining);
    }
    /**
     * Execute the stop sequence: fade → pause → sync
     */
    async executeStop() {
        if (this.phase !== 'countdown') {
            return;
        }
        this.phase = 'fading';
        // Clear countdown interval (keep sync for final position)
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = undefined;
        }
        let fadeResult = null;
        let fadeError = null;
        try {
            // Fade volume via proxy (silent!)
            fadeResult = await fadeOut(this.volumeTransform, this.fadeDurationMs, {
                steps: this.fadeSteps,
                signal: this.abortController?.signal,
            });
        }
        catch (error) {
            fadeError = error instanceof Error ? error : new Error(String(error));
            this.onError?.(fadeError, this.lastPosition);
        }
        // If cancelled during fade, don't continue
        // Note: cancel() sets phase to 'inactive' via cleanup() during fade
        if (fadeResult?.cancelled || this.abortController?.signal.aborted) {
            this.cleanup();
            return;
        }
        this.phase = 'completing';
        // Get final position
        try {
            const status = await this.castClient.getStatus();
            if (status?.currentTime !== undefined) {
                this.lastPosition = status.currentTime;
            }
        }
        catch {
            // Use last known position
        }
        // Sync final position
        try {
            if (this.onPositionSync) {
                await this.onPositionSync(this.lastPosition);
            }
        }
        catch {
            // Continue anyway
        }
        // Pause Cast playback
        try {
            await this.castClient.pause();
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.onError?.(err, this.lastPosition);
        }
        // Complete
        const finalPosition = this.lastPosition;
        this.cleanup();
        this.onComplete?.(finalPosition);
    }
    /**
     * Handle playback ending naturally (before timer)
     */
    handlePlaybackEnded() {
        // Playback finished on its own, cancel timer
        this.cleanup();
    }
    /**
     * Handle errors during timer operation
     */
    handleError(error) {
        this.onError?.(error, this.lastPosition);
        this.cleanup();
    }
    /**
     * Clean up all timers and state
     */
    cleanup() {
        this.phase = 'inactive';
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = undefined;
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = undefined;
        }
        if (this.countdownTimeout) {
            clearTimeout(this.countdownTimeout);
            this.countdownTimeout = undefined;
        }
        this.abortController = undefined;
        // Resolve the start() promise
        if (this.runPromiseResolve) {
            this.runPromiseResolve();
            this.runPromiseResolve = undefined;
        }
    }
}
//# sourceMappingURL=sleep-timer.js.map