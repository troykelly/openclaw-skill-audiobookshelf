/**
 * Position tracking for Cast playback
 *
 * Tracks playback position via polling and status events,
 * syncing changes back to Audiobookshelf.
 */
import type { DefaultMediaReceiver } from 'castv2-client';
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
export declare class PositionTracker {
    private readonly player;
    private readonly syncCallback;
    private pollInterval?;
    private lastPosition;
    private _isTracking;
    private readonly pollIntervalMs;
    private readonly positionThreshold;
    private readonly onPlaybackFinished?;
    private readonly onPlaybackError?;
    private statusHandler;
    constructor(player: DefaultMediaReceiver, syncCallback: SyncCallback, options?: PositionTrackerOptions);
    /**
     * Start position tracking
     */
    start(): void;
    /**
     * Stop position tracking
     * @returns The final tracked position
     */
    stop(): number;
    /**
     * Check if tracking is active
     */
    isTracking(): boolean;
    /**
     * Get current tracked position
     */
    getCurrentPosition(): number;
    /**
     * Handle status events from the player
     */
    private handleStatusEvent;
    /**
     * Poll for current position
     */
    private pollPosition;
    /**
     * Update position and trigger sync if threshold met
     */
    private updatePosition;
}
//# sourceMappingURL=position-tracker.d.ts.map