/**
 * Tests for Sleep Timer
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SleepTimer } from '../src/lib/sleep-timer.js';

describe('SleepTimer', () => {
  let timer: SleepTimer;
  let onSyncProgress: ReturnType<typeof vi.fn>;
  let onExpire: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onSyncProgress = vi.fn().mockResolvedValue(undefined);
    onExpire = vi.fn().mockResolvedValue(undefined);
    timer = new SleepTimer({
      onSyncProgress,
      onExpire,
    });
  });

  afterEach(() => {
    timer.cancel();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should start a timer for specified minutes', () => {
      timer.start(30);
      expect(timer.isActive()).toBe(true);
    });

    it('should set correct remaining time', () => {
      timer.start(5);
      expect(timer.getRemainingSeconds()).toBe(300); // 5 minutes = 300 seconds
    });

    it('should cancel existing timer when starting new one', () => {
      timer.start(10);
      timer.start(5);
      expect(timer.getRemainingSeconds()).toBe(300);
    });

    it('should throw for invalid minutes', () => {
      expect(() => {
        timer.start(0);
      }).toThrow();
      expect(() => {
        timer.start(-1);
      }).toThrow();
    });
  });

  describe('cancel', () => {
    it('should cancel active timer', () => {
      timer.start(10);
      timer.cancel();
      expect(timer.isActive()).toBe(false);
    });

    it('should be safe to call when no timer is active', () => {
      expect(() => {
        timer.cancel();
      }).not.toThrow();
    });

    it('should reset remaining time to 0', () => {
      timer.start(10);
      timer.cancel();
      expect(timer.getRemainingSeconds()).toBe(0);
    });
  });

  describe('getRemainingSeconds', () => {
    it('should return 0 when no timer is active', () => {
      expect(timer.getRemainingSeconds()).toBe(0);
    });

    it('should countdown correctly', () => {
      timer.start(1); // 1 minute = 60 seconds
      expect(timer.getRemainingSeconds()).toBe(60);

      vi.advanceTimersByTime(10000); // 10 seconds
      expect(timer.getRemainingSeconds()).toBe(50);

      vi.advanceTimersByTime(20000); // 20 more seconds
      expect(timer.getRemainingSeconds()).toBe(30);
    });

    it('should not go below 0', () => {
      timer.start(1);
      vi.advanceTimersByTime(120000); // 2 minutes
      expect(timer.getRemainingSeconds()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isActive', () => {
    it('should return false when no timer is active', () => {
      expect(timer.isActive()).toBe(false);
    });

    it('should return true when timer is running', () => {
      timer.start(10);
      expect(timer.isActive()).toBe(true);
    });

    it('should return false after timer expires', async () => {
      timer.start(1);
      vi.advanceTimersByTime(60000); // 1 minute
      await vi.runAllTimersAsync();
      expect(timer.isActive()).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call onSyncProgress before expiring', async () => {
      timer.start(1); // 1 minute
      vi.advanceTimersByTime(60000);
      await vi.runAllTimersAsync();

      expect(onSyncProgress).toHaveBeenCalled();
    });

    it('should call onExpire after sync', async () => {
      timer.start(1);
      vi.advanceTimersByTime(60000);
      await vi.runAllTimersAsync();

      expect(onExpire).toHaveBeenCalled();
    });

    it('should call onSyncProgress before onExpire', async () => {
      const callOrder: string[] = [];
      onSyncProgress.mockImplementation(() => {
        callOrder.push('sync');
        return Promise.resolve();
      });
      onExpire.mockImplementation(() => {
        callOrder.push('expire');
        return Promise.resolve();
      });

      timer.start(1);
      vi.advanceTimersByTime(60000);
      await vi.runAllTimersAsync();

      expect(callOrder).toEqual(['sync', 'expire']);
    });

    it('should call onExpire even if onSyncProgress fails', async () => {
      onSyncProgress.mockRejectedValue(new Error('Sync failed'));

      timer.start(1);
      vi.advanceTimersByTime(60000);
      await vi.runAllTimersAsync();

      expect(onExpire).toHaveBeenCalled();
    });

    it('should not call callbacks if timer is cancelled', async () => {
      timer.start(1);
      vi.advanceTimersByTime(30000); // 30 seconds
      timer.cancel();
      vi.advanceTimersByTime(60000); // past original expiry
      await vi.runAllTimersAsync();

      expect(onSyncProgress).not.toHaveBeenCalled();
      expect(onExpire).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return inactive status when no timer', () => {
      const status = timer.getStatus();
      expect(status.active).toBe(false);
      expect(status.remainingSeconds).toBe(0);
    });

    it('should return active status with remaining time', () => {
      timer.start(5);
      vi.advanceTimersByTime(60000); // 1 minute

      const status = timer.getStatus();
      expect(status.active).toBe(true);
      expect(status.remainingSeconds).toBe(240); // 4 minutes left
      expect(status.totalMinutes).toBe(5);
    });
  });

  describe('extend', () => {
    it('should extend active timer', () => {
      timer.start(5);
      vi.advanceTimersByTime(60000); // 1 minute
      expect(timer.getRemainingSeconds()).toBe(240);

      timer.extend(5); // Add 5 more minutes
      expect(timer.getRemainingSeconds()).toBe(540); // 9 minutes total
    });

    it('should throw if no timer is active', () => {
      expect(() => {
        timer.extend(5);
      }).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very short timers', async () => {
      const shortTimer = new SleepTimer({
        onSyncProgress,
        onExpire,
      });

      shortTimer.start(0.1); // 6 seconds
      expect(shortTimer.isActive()).toBe(true);

      vi.advanceTimersByTime(6000);
      await vi.runAllTimersAsync();

      expect(onExpire).toHaveBeenCalled();
      shortTimer.cancel();
    });

    it('should handle rapid start/cancel cycles', () => {
      for (let i = 0; i < 10; i++) {
        timer.start(10);
        timer.cancel();
      }
      expect(timer.isActive()).toBe(false);
    });
  });
});
