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
import { fadeOut, type FadeResult } from '../proxy/fade.js';
import { PlayerState } from './types.js';

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
export class CastSleepTimer {
  private readonly fadeDurationMs: number;
  private readonly fadeSteps: number;
  private readonly syncIntervalMs: number;
  private readonly latencyCompensationMs: number;
  private readonly onProgress?: (remainingMs: number) => void;
  private readonly onPositionSync?: (position: number) => Promise<void> | void;
  private readonly onComplete?: (finalPosition: number) => void;
  private readonly onError?: (error: Error, position: number) => void;

  private phase: SleepTimerPhase = 'inactive';
  private startTime = 0;
  private endTime = 0;
  private lastPosition = 0;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private syncInterval?: ReturnType<typeof setInterval>;
  private countdownTimeout?: ReturnType<typeof setTimeout>;
  private abortController?: AbortController;
  private runPromiseResolve?: () => void;

  /**
   * Create a new CastSleepTimer
   *
   * @param castClient - The Cast client for pause/status
   * @param volumeTransform - The VolumeTransform for fade control
   * @param options - Timer options
   */
  constructor(
    private readonly castClient: CastClient,
    private readonly volumeTransform: VolumeTransform,
    private readonly options: CastSleepTimerOptions
  ) {
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
  async start(): Promise<void> {
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
  cancel(): number {
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
  getPosition(): number {
    return this.lastPosition;
  }

  /**
   * Get remaining time until fade starts
   *
   * @returns Remaining milliseconds, or 0 if inactive
   */
  getRemainingMs(): number {
    if (this.phase === 'inactive') {
      return 0;
    }
    return Math.max(0, this.endTime - Date.now());
  }

  /**
   * Check if timer is active
   */
  isActive(): boolean {
    return this.phase !== 'inactive';
  }

  /**
   * Get full timer state
   */
  getState(): CastSleepTimerState {
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
  private async pollPosition(): Promise<void> {
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
    } catch (error) {
      // Connection lost or other error
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(): void {
    if (this.phase !== 'countdown') {
      return;
    }

    const remaining = this.getRemainingMs();
    this.onProgress?.(remaining);
  }

  /**
   * Execute the stop sequence: fade → pause → sync
   */
  private async executeStop(): Promise<void> {
    if (this.phase !== 'countdown') {
      return;
    }

    this.phase = 'fading';

    // Clear countdown interval (keep sync for final position)
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }

    let fadeResult: FadeResult | null = null;
    let fadeError: Error | null = null;

    try {
      // Fade volume via proxy (silent!)
      fadeResult = await fadeOut(this.volumeTransform, this.fadeDurationMs, {
        steps: this.fadeSteps,
        signal: this.abortController?.signal,
      });
    } catch (error) {
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
    } catch {
      // Use last known position
    }

    // Sync final position
    try {
      if (this.onPositionSync) {
        await this.onPositionSync(this.lastPosition);
      }
    } catch {
      // Continue anyway
    }

    // Pause Cast playback
    try {
      await this.castClient.pause();
    } catch (error) {
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
  private handlePlaybackEnded(): void {
    // Playback finished on its own, cancel timer
    this.cleanup();
  }

  /**
   * Handle errors during timer operation
   */
  private handleError(error: Error): void {
    this.onError?.(error, this.lastPosition);
    this.cleanup();
  }

  /**
   * Clean up all timers and state
   */
  private cleanup(): void {
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
