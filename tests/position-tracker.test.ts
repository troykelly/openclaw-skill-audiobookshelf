/**
 * Tests for position tracking and Audiobookshelf sync
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Type for callbacks
type StatusCallback = (err: Error | null, status: unknown) => void;

// Create mock player
class MockPlayer extends EventEmitter {
  getStatus = vi.fn((callback: StatusCallback): void => {
    setTimeout(
      () =>
        { callback(null, {
          currentTime: 120,
          playerState: 'PLAYING',
        }); },
      0
    );
  });
}

let mockPlayerInstance: MockPlayer;

describe('PositionTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPlayerInstance = new MockPlayer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // Import after mocks are set up
  const getModule = async () => {
    const { PositionTracker } = await import('../src/cast/position-tracker.js');
    return { PositionTracker };
  };

  describe('constructor', () => {
    it('should create tracker with default poll interval', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn();
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync);

      expect(tracker).toBeDefined();
    });

    it('should accept custom poll interval', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn();
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 5000,
      });

      expect(tracker).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start position tracking', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn();
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync);

      tracker.start();

      expect(tracker.isTracking()).toBe(true);
    });

    it('should poll for position at intervals', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn();
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 10000,
      });

      tracker.start();

      // Wait for first poll
      await vi.advanceTimersByTimeAsync(10000);

      expect(mockPlayerInstance.getStatus).toHaveBeenCalled();
    });

    it('should call sync callback when position changes', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 10000,
        positionThreshold: 1,
      });

      tracker.start();

      // Advance to trigger poll
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10);

      expect(onSync).toHaveBeenCalledWith(120);
    });

    it('should respect position threshold', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 1000,
        positionThreshold: 5,
      });

      tracker.start();

      // First poll - should sync
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(10);
      expect(onSync).toHaveBeenCalledTimes(1);

      // Second poll with same position - should not sync
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(10);
      expect(onSync).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should handle status events', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 60000, // Long interval
        positionThreshold: 1,
      });

      tracker.start();

      // Emit status event
      mockPlayerInstance.emit('status', {
        currentTime: 300,
        playerState: 'PLAYING',
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(onSync).toHaveBeenCalledWith(300);
    });
  });

  describe('stop', () => {
    it('should stop position tracking', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn();
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync);

      tracker.start();
      const finalPosition = tracker.stop();

      expect(tracker.isTracking()).toBe(false);
      expect(typeof finalPosition).toBe('number');
    });

    it('should return final position', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 1000,
      });

      tracker.start();

      // Advance to get a position
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(10);

      const finalPosition = tracker.stop();

      expect(finalPosition).toBe(120);
    });

    it('should stop polling after stop', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn();
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 1000,
      });

      tracker.start();
      tracker.stop();

      const callCount = mockPlayerInstance.getStatus.mock.calls.length;

      // Advance time
      await vi.advanceTimersByTimeAsync(5000);

      // Should not have more calls
      expect(mockPlayerInstance.getStatus).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('getCurrentPosition', () => {
    it('should return current tracked position', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 1000,
      });

      tracker.start();

      // Advance to get a position
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(10);

      expect(tracker.getCurrentPosition()).toBe(120);
    });

    it('should return 0 before any position received', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn();
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync);

      expect(tracker.getCurrentPosition()).toBe(0);
    });
  });

  describe('player state handling', () => {
    it('should not poll when player is paused', async () => {
      const { PositionTracker } = await getModule();
      const onSync = vi.fn();
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        pollIntervalMs: 1000,
      });

      // Mock paused status
      mockPlayerInstance.getStatus = vi.fn((callback: StatusCallback) => {
        setTimeout(
          () =>
            { callback(null, {
              currentTime: 120,
              playerState: 'PAUSED',
            }); },
          0
        );
      });

      tracker.start();

      // Poll returns PAUSED - should not trigger sync
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(10);

      expect(onSync).not.toHaveBeenCalled();
    });

    it('should handle IDLE state with FINISHED reason', async () => {
      const { PositionTracker } = await getModule();
      const onFinished = vi.fn();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        onPlaybackFinished: onFinished,
      });

      tracker.start();

      // Emit IDLE with FINISHED
      mockPlayerInstance.emit('status', {
        currentTime: 3600,
        playerState: 'IDLE',
        idleReason: 'FINISHED',
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(onFinished).toHaveBeenCalledWith(3600);
    });

    it('should handle IDLE state with ERROR reason', async () => {
      const { PositionTracker } = await getModule();
      const onError = vi.fn();
      const onSync = vi.fn().mockResolvedValue(undefined);
      const tracker = new PositionTracker(mockPlayerInstance as never, onSync, {
        onPlaybackError: onError,
      });

      tracker.start();

      // Emit IDLE with ERROR
      mockPlayerInstance.emit('status', {
        currentTime: 500,
        playerState: 'IDLE',
        idleReason: 'ERROR',
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(onError).toHaveBeenCalledWith(500);
    });
  });
});
