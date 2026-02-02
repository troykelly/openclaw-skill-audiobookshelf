/**
 * Tests for VolumeTransform
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { VolumeTransform } from '../src/proxy/volume-transform.js';

describe('VolumeTransform', () => {
  let transform: VolumeTransform;

  beforeEach(() => {
    transform = new VolumeTransform();
  });

  describe('constructor', () => {
    it('should create with default volume of 1.0', () => {
      expect(transform.volume).toBe(1.0);
    });

    it('should accept initial volume', () => {
      const t = new VolumeTransform({ initialVolume: 0.5 });
      expect(t.volume).toBe(0.5);
    });

    it('should clamp initial volume to max 1.5', () => {
      const t = new VolumeTransform({ initialVolume: 2.0 });
      expect(t.volume).toBe(1.5);
    });

    it('should clamp initial volume to min 0', () => {
      const t = new VolumeTransform({ initialVolume: -0.5 });
      expect(t.volume).toBe(0);
    });
  });

  describe('setVolume', () => {
    it('should set volume', () => {
      transform.setVolume(0.8);
      expect(transform.volume).toBe(0.8);
    });

    it('should clamp to max 1.5', () => {
      transform.setVolume(3.0);
      expect(transform.volume).toBe(1.5);
    });

    it('should clamp to min 0', () => {
      transform.setVolume(-1.0);
      expect(transform.volume).toBe(0);
    });
  });

  describe('_transform', () => {
    const processTransform = (
      transform: VolumeTransform,
      input: Buffer
    ): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        transform.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        transform.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        transform.on('error', reject);
        transform.write(input);
        transform.end();
      });
    };

    it('should pass through at volume 1.0', async () => {
      const input = Buffer.alloc(4);
      input.writeInt16LE(1000, 0);
      input.writeInt16LE(-1000, 2);

      transform.setVolume(1.0);

      const output = await processTransform(transform, input);
      expect(output.readInt16LE(0)).toBe(1000);
      expect(output.readInt16LE(2)).toBe(-1000);
    });

    it('should reduce volume at 0.5', async () => {
      const input = Buffer.alloc(4);
      input.writeInt16LE(1000, 0);
      input.writeInt16LE(-1000, 2);

      transform.setVolume(0.5);

      const output = await processTransform(transform, input);
      expect(output.readInt16LE(0)).toBe(500);
      expect(output.readInt16LE(2)).toBe(-500);
    });

    it('should amplify at volume 1.5', async () => {
      const input = Buffer.alloc(4);
      input.writeInt16LE(1000, 0);
      input.writeInt16LE(-1000, 2);

      transform.setVolume(1.5);

      const output = await processTransform(transform, input);
      expect(output.readInt16LE(0)).toBe(1500);
      expect(output.readInt16LE(2)).toBe(-1500);
    });

    it('should clamp to prevent overflow', async () => {
      const input = Buffer.alloc(4);
      input.writeInt16LE(30000, 0);
      input.writeInt16LE(-30000, 2);

      transform.setVolume(1.5);

      const output = await processTransform(transform, input);
      // 30000 * 1.5 = 45000, clamped to 32767
      expect(output.readInt16LE(0)).toBe(32767);
      // -30000 * 1.5 = -45000, clamped to -32768
      expect(output.readInt16LE(2)).toBe(-32768);
    });

    it('should mute at volume 0', async () => {
      const input = Buffer.alloc(4);
      input.writeInt16LE(1000, 0);
      input.writeInt16LE(-1000, 2);

      transform.setVolume(0);

      const output = await processTransform(transform, input);
      expect(output.readInt16LE(0)).toBe(0);
      expect(output.readInt16LE(2)).toBe(0);
    });
  });

  describe('big endian support', () => {
    it('should handle s16be format', async () => {
      const t = new VolumeTransform({
        initialVolume: 0.5,
        sampleFormat: 's16be',
      });

      const input = Buffer.alloc(4);
      input.writeInt16BE(1000, 0);
      input.writeInt16BE(-1000, 2);

      const output = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        t.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        t.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        t.on('error', reject);
        t.write(input);
        t.end();
      });

      expect(output.readInt16BE(0)).toBe(500);
      expect(output.readInt16BE(2)).toBe(-500);
    });
  });
});
