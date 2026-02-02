/**
 * Tests for Cast Sleep Timer with fade-out
 *
 * Tests the enhanced sleep timer that integrates with audio proxy
 * for silent volume fades and position tracking.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the modules before importing
vi.mock('../src/proxy/fade.js', () => ({
  fadeOut: vi.fn().mockResolvedValue({
    completed: true,
    finalVolume: 0,
    stepsExecuted: 30,
    cancelled: false,
  }),
  FadeAbortedError: class extends Error {
    constructor(
      public readonly finalVolume: number,
      public readonly stepsExecuted: number
    ) {
      super('Fade operation was aborted');
      this.name = 'FadeAbortedError';
    }
  },
}));

import {
  CastSleepTimer,
  type CastSleepTimerOptions,
  type CastSleepTimerState,
} from '../src/cast/sleep-timer.js';
import { fadeOut } from '../src/proxy/fade.js';

// Mock CastClient
function createMockCastClient() {
  return {
    pause: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      currentTime: 100,
      playerState: 'PLAYING',
    }),
    isConnected: vi.fn().mockReturnValue(true),
    on: vi.fn(),
    off: vi.fn(),
    removeListener: vi.fn(),
  };
}

// Mock VolumeTransform
function createMockVolumeTransform() {
  return {
    volume: 1.0,
    setVolume: vi.fn(),
  };
}

describe('CastSleepTimer', () => {
  let timer: CastSleepTimer | undefined;
  let mockCastClient: ReturnType<typeof createMockCastClient>;
  let mockVolumeTransform: ReturnType<typeof createMockVolumeTransform>;
  let onProgress: ReturnType<typeof vi.fn>;
  let onPositionSync: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockCastClient = createMockCastClient();
    mockVolumeTransform = createMockVolumeTransform();

    onProgress = vi.fn();
    onPositionSync = vi.fn().mockResolvedValue(undefined);
    onComplete = vi.fn();
    onError = vi.fn();
  });

  afterEach(() => {
    timer?.cancel();
    vi.useRealTimers();
  });

  function createTimer(overrides: Partial<CastSleepTimerOptions> = {}): CastSleepTimer {
    const options: CastSleepTimerOptions = {
      durationMs: 60000, // 1 minute
      fadeDurationMs: 5000, // 5 second fade
      fadeSteps: 10,
      syncIntervalMs: 10000, // 10 second sync interval
      latencyCompensationMs: 0, // Disable for predictable tests
      onProgress,
      onPositionSync,
      onComplete,
      onError,
      ...overrides,
    };

    return new CastSleepTimer(
      mockCastClient as unknown as ConstructorParameters<typeof CastSleepTimer>[0],
      mockVolumeTransform as unknown as ConstructorParameters<typeof CastSleepTimer>[1],
      options
    );
  }

  describe('constructor', () => {
    it('should accept required options', () => {
      timer = createTimer();
      expect(timer).toBeDefined();
    });

    it('should use default values for optional options', () => {
      timer = new CastSleepTimer(
        mockCastClient as unknown as ConstructorParameters<typeof CastSleepTimer>[0],
        mockVolumeTransform as unknown as ConstructorParameters<typeof CastSleepTimer>[1],
        { durationMs: 30000 }
      );
      expect(timer).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start the timer and track state', async () => {
      timer = createTimer();
      // Don't await start() directly - just check state
      void timer.start();

      // Give time for initial poll
      await vi.advanceTimersByTimeAsync(1);

      expect(timer.isActive()).toBe(true);
      expect(timer.getRemainingMs()).toBeLessThanOrEqual(60000);

      timer.cancel();
    });

    it('should throw if already running', async () => {
      timer = createTimer();
      const promise1 = timer.start();

      await expect(timer.start()).rejects.toThrow(/already running/i);

      timer.cancel();
      await promise1;
    });

    it('should call onProgress during countdown', async () => {
      timer = createTimer();
      const promise = timer.start();

      // Advance time partially
      await vi.advanceTimersByTimeAsync(5000);

      expect(onProgress).toHaveBeenCalled();
      const calls = onProgress.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      timer.cancel();
      await promise;
    });

    it('should sync position periodically', async () => {
      timer = createTimer();
      const promise = timer.start();

      // Advance past one sync interval (10 seconds)
      await vi.advanceTimersByTimeAsync(11000);

      expect(onPositionSync).toHaveBeenCalled();

      timer.cancel();
      await promise;
    });

    it('should get position from Cast client', async () => {
      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(11000);

      expect(mockCastClient.getStatus).toHaveBeenCalled();

      timer.cancel();
      await promise;
    });
  });

  describe('fade-out and complete', () => {
    it('should fade volume before pausing', async () => {
      timer = createTimer();
      const promise = timer.start();

      // Advance to end of countdown (triggers fade)
      await vi.advanceTimersByTimeAsync(60000);

      expect(fadeOut).toHaveBeenCalledWith(
        mockVolumeTransform,
        5000, // fadeDurationMs
        expect.objectContaining({ steps: 10 })
      );

      await promise;
    });

    it('should pause Cast after fade completes', async () => {
      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(60000);

      expect(mockCastClient.pause).toHaveBeenCalled();
      await promise;
    });

    it('should call onComplete with final position', async () => {
      mockCastClient.getStatus.mockResolvedValue({
        currentTime: 150,
        playerState: 'PLAYING',
      });

      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(60000);

      expect(onComplete).toHaveBeenCalledWith(150);
      await promise;
    });

    it('should sync final position before completing', async () => {
      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(60000);

      // onPositionSync should be called with the final position
      expect(onPositionSync).toHaveBeenCalled();
      await promise;
    });
  });

  describe('cancel', () => {
    it('should cancel active timer', async () => {
      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(30000); // Half way
      const position = timer.cancel();

      expect(timer.isActive()).toBe(false);
      expect(position).toBeGreaterThanOrEqual(0);

      await promise;
    });

    it('should return last known position', async () => {
      mockCastClient.getStatus.mockResolvedValue({
        currentTime: 75,
        playerState: 'PLAYING',
      });

      timer = createTimer();
      const promise = timer.start();

      // Advance and let position sync
      await vi.advanceTimersByTimeAsync(11000);

      const position = timer.cancel();
      expect(position).toBe(75);

      await promise;
    });

    it('should not call onComplete when cancelled', async () => {
      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(30000);
      timer.cancel();

      await vi.advanceTimersByTimeAsync(60000);

      expect(onComplete).not.toHaveBeenCalled();
      await promise;
    });
  });

  describe('getPosition', () => {
    it('should return current tracked position', async () => {
      mockCastClient.getStatus.mockResolvedValue({
        currentTime: 42,
        playerState: 'PLAYING',
      });

      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(11000);

      expect(timer.getPosition()).toBe(42);

      timer.cancel();
      await promise;
    });

    it('should return 0 if not started', () => {
      timer = createTimer();
      expect(timer.getPosition()).toBe(0);
    });
  });

  describe('getRemainingMs', () => {
    it('should return remaining time', async () => {
      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(20000);

      const remaining = timer.getRemainingMs();
      expect(remaining).toBeLessThanOrEqual(40000);
      expect(remaining).toBeGreaterThan(0);

      timer.cancel();
      await promise;
    });

    it('should return 0 if not active', () => {
      timer = createTimer();
      expect(timer.getRemainingMs()).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return full timer state', async () => {
      mockCastClient.getStatus.mockResolvedValue({
        currentTime: 100,
        playerState: 'PLAYING',
      });

      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(11000);

      const state = timer.getState();

      expect(state).toMatchObject<Partial<CastSleepTimerState>>({
        active: true,
        position: 100,
        phase: 'countdown',
      });
      expect(state.remainingMs).toBeLessThan(60000);

      timer.cancel();
      await promise;
    });

    it('should report "inactive" when not running', () => {
      timer = createTimer();
      const state = timer.getState();
      expect(state.active).toBe(false);
      expect(state.phase).toBe('inactive');
    });
  });

  describe('edge cases', () => {
    it('should handle playback ending naturally during countdown', async () => {
      // After some time, status shows IDLE (finished)
      mockCastClient.getStatus
        .mockResolvedValueOnce({ currentTime: 50, playerState: 'PLAYING' })
        .mockResolvedValueOnce({ currentTime: 100, playerState: 'IDLE' });

      timer = createTimer();
      const promise = timer.start();

      // First poll
      await vi.advanceTimersByTimeAsync(11000);

      // Second poll - playback ended
      await vi.advanceTimersByTimeAsync(11000);

      // Timer should have deactivated
      expect(timer.isActive()).toBe(false);

      await promise;
    });

    it('should handle connection loss gracefully', async () => {
      mockCastClient.isConnected.mockReturnValue(false);
      mockCastClient.getStatus.mockRejectedValue(new Error('Not connected'));

      timer = createTimer();
      void timer.start();

      // Give time for initial poll (which will fail)
      await vi.advanceTimersByTimeAsync(1);

      expect(onError).toHaveBeenCalled();
      expect(timer.isActive()).toBe(false);
    });

    it('should handle fade failure gracefully', async () => {
      vi.mocked(fadeOut).mockRejectedValue(new Error('Fade failed'));

      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(60000);

      // Should still try to pause
      expect(mockCastClient.pause).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();

      await promise;
    });

    it('should handle pause failure gracefully', async () => {
      mockCastClient.pause.mockRejectedValue(new Error('Pause failed'));

      timer = createTimer();
      const promise = timer.start();

      await vi.advanceTimersByTimeAsync(60000);

      expect(onError).toHaveBeenCalled();
      expect(timer.isActive()).toBe(false);

      await promise;
    });

    it('should sync position multiple times during countdown', async () => {
      timer = createTimer();
      const promise = timer.start();

      // Multiple sync intervals (25 seconds = 2+ intervals of 10s each)
      await vi.advanceTimersByTimeAsync(25000);

      expect(onPositionSync.mock.calls.length).toBeGreaterThanOrEqual(2);

      timer.cancel();
      await promise;
    });
  });

  describe('latency compensation', () => {
    it('should start fade early when latency compensation is set', async () => {
      timer = createTimer({ latencyCompensationMs: 2000 });
      const promise = timer.start();

      // At 58 seconds (60 - 2 latency), fade should trigger
      await vi.advanceTimersByTimeAsync(58000);

      // Fade should have been called
      expect(fadeOut).toHaveBeenCalled();

      await promise;
    });
  });
});
