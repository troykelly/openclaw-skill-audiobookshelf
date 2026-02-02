/**
 * Tests for volume fade utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fadeVolume, fadeOut, fadeIn } from '../src/proxy/fade.js';
import { VolumeTransform } from '../src/proxy/volume-transform.js';

describe('Volume Fade', () => {
  let transform: VolumeTransform;

  beforeEach(() => {
    vi.useFakeTimers();
    transform = new VolumeTransform();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('fadeVolume', () => {
    it('should fade from one volume to another', async () => {
      const fadePromise = fadeVolume(transform, 1.0, 0.0, 1000, { steps: 10 });

      // Advance through all steps
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      const result = await fadePromise;

      expect(result.completed).toBe(true);
      expect(result.finalVolume).toBe(0);
      expect(result.stepsExecuted).toBe(10);
      expect(result.cancelled).toBe(false);
    });

    it('should set intermediate volume levels', async () => {
      const volumes: number[] = [];
      const onStep = (vol: number): void => {
        volumes.push(vol);
      };

      const fadePromise = fadeVolume(transform, 1.0, 0.0, 500, {
        steps: 5,
        onStep,
      });

      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      await fadePromise;

      expect(volumes).toHaveLength(5);
      expect(volumes[0]).toBeCloseTo(0.8, 1);
      expect(volumes[4]).toBeCloseTo(0, 1);
    });

    it('should support cancellation via AbortSignal', async () => {
      const controller = new AbortController();

      const fadePromise = fadeVolume(transform, 1.0, 0.0, 1000, {
        steps: 10,
        signal: controller.signal,
      });

      // Advance 3 steps
      await vi.advanceTimersByTimeAsync(300);

      // Abort
      controller.abort();

      // Continue time
      await vi.advanceTimersByTimeAsync(1000);

      const result = await fadePromise;

      expect(result.completed).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(result.stepsExecuted).toBeLessThan(10);
    });

    it('should fade up (volume increase)', async () => {
      transform.setVolume(0.2);

      const fadePromise = fadeVolume(transform, 0.2, 1.0, 500, { steps: 4 });

      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(125);
      }

      const result = await fadePromise;

      expect(result.completed).toBe(true);
      expect(result.finalVolume).toBe(1.0);
    });

    it('should clamp volume to valid range', async () => {
      const fadePromise = fadeVolume(transform, 2.0, -0.5, 100, { steps: 2 });

      await vi.advanceTimersByTimeAsync(100);

      await fadePromise;

      // Start clamped to 1.5, end clamped to 0
      expect(transform.volume).toBe(0);
    });
  });

  describe('fadeOut', () => {
    it('should fade from current volume to 0', async () => {
      transform.setVolume(0.8);

      const fadePromise = fadeOut(transform, 500, { steps: 5 });

      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      const result = await fadePromise;

      expect(result.completed).toBe(true);
      expect(result.finalVolume).toBe(0);
    });
  });

  describe('fadeIn', () => {
    it('should fade from 0 to target volume', async () => {
      transform.setVolume(0);

      const fadePromise = fadeIn(transform, 1.0, 500, { steps: 5 });

      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      const result = await fadePromise;

      expect(result.completed).toBe(true);
      expect(result.finalVolume).toBe(1.0);
    });
  });

  describe('step callback', () => {
    it('should call onStep for each step', async () => {
      const onStep = vi.fn();

      const fadePromise = fadeVolume(transform, 1.0, 0.0, 300, {
        steps: 3,
        onStep,
      });

      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      await fadePromise;

      expect(onStep).toHaveBeenCalledTimes(3);
      expect(onStep).toHaveBeenNthCalledWith(1, expect.any(Number), 1, 3);
      expect(onStep).toHaveBeenNthCalledWith(2, expect.any(Number), 2, 3);
      expect(onStep).toHaveBeenNthCalledWith(3, expect.any(Number), 3, 3);
    });
  });
});
