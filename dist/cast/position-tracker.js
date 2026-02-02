/**
 * Position tracking for Cast playback
 *
 * Tracks playback position via polling and status events,
 * syncing changes back to Audiobookshelf.
 */
import { PlayerState, IdleReason } from './types.js';
/**
 * Position tracker for Cast playback
 *
 * Tracks the current playback position using:
 * 1. Status events (push) - immediate updates on state changes
 * 2. Periodic polling (pull) - regular position updates during playback
 */
export class PositionTracker {
    player;
    syncCallback;
    pollInterval;
    lastPosition = 0;
    _isTracking = false;
    pollIntervalMs;
    positionThreshold;
    onPlaybackFinished;
    onPlaybackError;
    statusHandler = null;
    constructor(player, syncCallback, options = {}) {
        this.player = player;
        this.syncCallback = syncCallback;
        this.pollIntervalMs = options.pollIntervalMs ?? 10000;
        this.positionThreshold = options.positionThreshold ?? 1;
        this.onPlaybackFinished = options.onPlaybackFinished;
        this.onPlaybackError = options.onPlaybackError;
    }
    /**
     * Start position tracking
     */
    start() {
        if (this._isTracking) {
            return;
        }
        this._isTracking = true;
        // Set up status event listener
        this.statusHandler = (status) => {
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
    stop() {
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
    isTracking() {
        return this._isTracking;
    }
    /**
     * Get current tracked position
     */
    getCurrentPosition() {
        return this.lastPosition;
    }
    /**
     * Handle status events from the player
     */
    handleStatusEvent(status) {
        // Status is always defined from the event, but guard just in case
        const currentTime = status.currentTime ?? 0;
        const playerState = status.playerState;
        const idleReason = status.idleReason;
        // Handle IDLE state with reasons
        if (playerState === PlayerState.IDLE) {
            if (idleReason === IdleReason.FINISHED) {
                this.onPlaybackFinished?.(currentTime);
            }
            else if (idleReason === IdleReason.ERROR) {
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
    pollPosition() {
        this.player.getStatus((err, status) => {
            if (err || !status) {
                return;
            }
            const playerState = status.playerState;
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
    updatePosition(position) {
        const change = Math.abs(position - this.lastPosition);
        if (change >= this.positionThreshold) {
            this.lastPosition = position;
            // Fire and forget sync
            void this.syncCallback(position);
        }
    }
}
//# sourceMappingURL=position-tracker.js.map