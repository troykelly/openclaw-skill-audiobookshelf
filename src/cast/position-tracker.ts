/**
 * Position tracking for Cast playback
 *
 * Tracks playback position via polling and status events,
 * syncing changes back to Audiobookshelf.
 */

import type { DefaultMediaReceiver, PlayerStatus } from 'castv2-client';
import { PlayerState, IdleReason } from './types.js';

/**
 * Callback for position sync
 */
export type SyncCallback = (position: number) => Promise<void> | void;

/**
 * Callback for playback finished
 */
export type FinishedCallback = (finalPosition: number) => void;

/**
 * Callback for playback error
 */
export type ErrorCallback = (position: number) => void;

/**
 * Options for PositionTracker
 */
export interface PositionTrackerOptions {
  /** Poll interval in milliseconds (default: 10000) */
  pollIntervalMs?: number;
  /** Minimum position change to trigger sync (default: 1 second) */
  positionThreshold?: number;
  /** Callback when playback finishes normally */
  onPlaybackFinished?: FinishedCallback;
  /** Callback when playback errors */
  onPlaybackError?: ErrorCallback;
}

/**
 * Position tracker for Cast playback
 *
 * Tracks the current playback position using:
 * 1. Status events (push) - immediate updates on state changes
 * 2. Periodic polling (pull) - regular position updates during playback
 */
export class PositionTracker {
  private pollInterval?: NodeJS.Timeout;
  private lastPosition = 0;
  private _isTracking = false;
  private readonly pollIntervalMs: number;
  private readonly positionThreshold: number;
  private readonly onPlaybackFinished?: FinishedCallback;
  private readonly onPlaybackError?: ErrorCallback;
  private statusHandler: ((status: PlayerStatus) => void) | null = null;

  constructor(
    private readonly player: DefaultMediaReceiver,
    private readonly syncCallback: SyncCallback,
    options: PositionTrackerOptions = {}
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 10000;
    this.positionThreshold = options.positionThreshold ?? 1;
    this.onPlaybackFinished = options.onPlaybackFinished;
    this.onPlaybackError = options.onPlaybackError;
  }

  /**
   * Start position tracking
   */
  start(): void {
    if (this._isTracking) {
      return;
    }

    this._isTracking = true;

    // Set up status event listener
    this.statusHandler = (status: PlayerStatus) => {
      this.handleStatusEvent(status);
    };
    this.player.on('status', this.statusHandler);

    // Start polling
    this.pollInterval = setInterval(() => {
      this.pollPosition();
    }, this.pollIntervalMs);
  }

  /**
   * Stop position tracking
   * @returns The final tracked position
   */
  stop(): number {
    this._isTracking = false;

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }

    // Remove status listener
    if (this.statusHandler) {
      this.player.removeListener('status', this.statusHandler);
      this.statusHandler = null;
    }

    return this.lastPosition;
  }

  /**
   * Check if tracking is active
   */
  isTracking(): boolean {
    return this._isTracking;
  }

  /**
   * Get current tracked position
   */
  getCurrentPosition(): number {
    return this.lastPosition;
  }

  /**
   * Handle status events from the player
   */
  private handleStatusEvent(status: PlayerStatus): void {
    // Status is always defined from the event, but guard just in case

    const currentTime = status.currentTime ?? 0;
    const playerState = status.playerState as PlayerState | undefined;
    const idleReason = (status as { idleReason?: string }).idleReason as
      | IdleReason
      | undefined;

    // Handle IDLE state with reasons
    if (playerState === PlayerState.IDLE) {
      if (idleReason === IdleReason.FINISHED) {
        this.onPlaybackFinished?.(currentTime);
      } else if (idleReason === IdleReason.ERROR) {
        this.onPlaybackError?.(currentTime);
      }
      return;
    }

    // Update position for PLAYING state
    if (playerState === PlayerState.PLAYING) {
      this.updatePosition(currentTime);
    }
  }

  /**
   * Poll for current position
   */
  private pollPosition(): void {
    this.player.getStatus((err, status) => {
      if (err || !status) {
        return;
      }

      const playerState = status.playerState as PlayerState | undefined;

      // Only sync during active playback
      if (playerState === PlayerState.PLAYING) {
        const currentTime = status.currentTime ?? 0;
        this.updatePosition(currentTime);
      }
    });
  }

  /**
   * Update position and trigger sync if threshold met
   */
  private updatePosition(position: number): void {
    const change = Math.abs(position - this.lastPosition);

    if (change >= this.positionThreshold) {
      this.lastPosition = position;
      // Fire and forget sync
      void this.syncCallback(position);
    }
  }
}
