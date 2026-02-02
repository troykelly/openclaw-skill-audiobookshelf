/**
 * Volume Fade Utilities
 *
 * Provides smooth volume fading for the audio proxy.
 * Uses PCM volume control for silent fades (no Cast "bloop" sounds).
 */
import type { VolumeTransform } from './volume-transform.js';
/**
 * Options for fadeVolume
 */
export interface FadeOptions {
    /** Number of steps for the fade (default: 30) */
    steps?: number;
    /** AbortSignal for cancellation */
    signal?: AbortSignal;
    /** Callback for each step (for progress reporting) */
    onStep?: (currentVolume: number, step: number, totalSteps: number) => void;
}
/**
 * Result of a fade operation
 */
export interface FadeResult {
    /** Whether the fade completed fully */
    completed: boolean;
    /** Final volume level */
    finalVolume: number;
    /** Number of steps executed */
    stepsExecuted: number;
    /** Whether the fade was cancelled */
    cancelled: boolean;
}
/**
 * Error thrown when fade is aborted
 */
export declare class FadeAbortedError extends Error {
    readonly finalVolume: number;
    readonly stepsExecuted: number;
    constructor(finalVolume: number, stepsExecuted: number);
}
/**
 * Smoothly fade volume from one level to another
 *
 * Uses the VolumeTransform's PCM volume control for completely silent fades.
 * Latency: ~2-4 seconds from setVolume() to audible change.
 *
 * @param transform - The VolumeTransform to control
 * @param from - Starting volume (0.0 - 1.5)
 * @param to - Target volume (0.0 - 1.5)
 * @param durationMs - Total fade duration in milliseconds
 * @param options - Additional options
 * @returns Promise that resolves when fade completes
 */
export declare function fadeVolume(transform: VolumeTransform, from: number, to: number, durationMs: number, options?: FadeOptions): Promise<FadeResult>;
/**
 * Fade out (volume to 0) over duration
 */
export declare function fadeOut(transform: VolumeTransform, durationMs: number, options?: FadeOptions): Promise<FadeResult>;
/**
 * Fade in (0 to volume) over duration
 */
export declare function fadeIn(transform: VolumeTransform, targetVolume: number, durationMs: number, options?: FadeOptions): Promise<FadeResult>;
//# sourceMappingURL=fade.d.ts.map