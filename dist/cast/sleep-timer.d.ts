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
import type { CastClient } from './client.js';
import type { VolumeTransform } from '../proxy/volume-transform.js';
/**
 * Phase of the sleep timer lifecycle
 */
export type SleepTimerPhase = 'inactive' | 'countdown' | 'fading' | 'completing';
/**
 * Options for CastSleepTimer
 */
export interface CastSleepTimerOptions {
    /** Time until fade starts (milliseconds) */
    durationMs: number;
    /** Fade duration in milliseconds (default: 30000 = 30s) */
    fadeDurationMs?: number;
    /** Number of fade steps (default: 30) */
    fadeSteps?: number;
    /** Position sync interval in milliseconds (default: 10000 = 10s) */
    syncIntervalMs?: number;
    /** Latency compensation in milliseconds (default: 2000 = 2s) */
    latencyCompensationMs?: number;
    /** Progress callback - receives remaining milliseconds */
    onProgress?: (remainingMs: number) => void;
    /** Position sync callback - called periodically with current position */
    onPositionSync?: (position: number) => Promise<void> | void;
    /** Completion callback - called with final position after fade and pause */
    onComplete?: (finalPosition: number) => void;
    /** Error callback - called if timer encounters an error */
    onError?: (error: Error, position: number) => void;
}
/**
 * Current state of the sleep timer
 */
export interface CastSleepTimerState {
    /** Whether the timer is active */
    active: boolean;
    /** Current phase */
    phase: SleepTimerPhase;
    /** Remaining time until fade starts (milliseconds) */
    remainingMs: number;
    /** Current playback position (seconds) */
    position: number;
    /** Total duration setting (milliseconds) */
    totalDurationMs: number;
    /** Fade duration setting (milliseconds) */
    fadeDurationMs: number;
}
/**
 * Sleep timer that integrates with audio proxy for silent volume fades.
 *
 * Uses the VolumeTransform's PCM volume control for completely silent fades -
 * no Cast "bloop" sounds. Position is tracked during countdown and synced
 * to Audiobookshelf before completion.
 */
export declare class CastSleepTimer {
    private readonly castClient;
    private readonly volumeTransform;
    private readonly options;
    private readonly fadeDurationMs;
    private readonly fadeSteps;
    private readonly syncIntervalMs;
    private readonly latencyCompensationMs;
    private readonly onProgress?;
    private readonly onPositionSync?;
    private readonly onComplete?;
    private readonly onError?;
    private phase;
    private startTime;
    private endTime;
    private lastPosition;
    private countdownInterval?;
    private syncInterval?;
    private countdownTimeout?;
    private abortController?;
    private runPromiseResolve?;
    /**
     * Create a new CastSleepTimer
     *
     * @param castClient - The Cast client for pause/status
     * @param volumeTransform - The VolumeTransform for fade control
     * @param options - Timer options
     */
    constructor(castClient: CastClient, volumeTransform: VolumeTransform, options: CastSleepTimerOptions);
    /**
     * Start the sleep timer
     *
     * @throws Error if already running
     * @returns Promise that resolves when timer completes or is cancelled
     */
    start(): Promise<void>;
    /**
     * Cancel the sleep timer
     *
     * @returns Last known playback position (seconds)
     */
    cancel(): number;
    /**
     * Get current tracked playback position
     *
     * @returns Position in seconds
     */
    getPosition(): number;
    /**
     * Get remaining time until fade starts
     *
     * @returns Remaining milliseconds, or 0 if inactive
     */
    getRemainingMs(): number;
    /**
     * Check if timer is active
     */
    isActive(): boolean;
    /**
     * Get full timer state
     */
    getState(): CastSleepTimerState;
    /**
     * Poll Cast client for current position
     */
    private pollPosition;
    /**
     * Report progress to callback
     */
    private reportProgress;
    /**
     * Execute the stop sequence: fade → pause → sync
     */
    private executeStop;
    /**
     * Handle playback ending naturally (before timer)
     */
    private handlePlaybackEnded;
    /**
     * Handle errors during timer operation
     */
    private handleError;
    /**
     * Clean up all timers and state
     */
    private cleanup;
}
//# sourceMappingURL=sleep-timer.d.ts.map