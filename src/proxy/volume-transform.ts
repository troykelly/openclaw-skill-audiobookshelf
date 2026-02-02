/**
 * PCM Volume Transform Stream
 *
 * Transforms PCM audio data by adjusting volume levels in real-time.
 * Used in the audio proxy pipeline to enable silent volume fades.
 */

import { Transform, type TransformCallback } from 'stream';

/**
 * Options for VolumeTransform
 */
export interface VolumeTransformOptions {
  /** Initial volume level (0.0 - 1.5, default: 1.0) */
  initialVolume?: number;
  /** Sample format: 's16le' (default) or 's16be' */
  sampleFormat?: 's16le' | 's16be';
}

/**
 * Transform stream that adjusts PCM audio volume in real-time
 *
 * Expects signed 16-bit PCM audio input.
 * Volume can be adjusted between 0.0 and 1.5 (150% max to avoid major clipping).
 */
export class VolumeTransform extends Transform {
  private _volume: number;
  private readonly isLittleEndian: boolean;

  constructor(options: VolumeTransformOptions = {}) {
    super();
    this._volume = Math.max(0, Math.min(1.5, options.initialVolume ?? 1.0));
    this.isLittleEndian = (options.sampleFormat ?? 's16le') === 's16le';
  }

  /**
   * Get current volume level
   */
  get volume(): number {
    return this._volume;
  }

  /**
   * Set volume level
   * @param value - Volume level (0.0 = silent, 1.0 = normal, 1.5 = max)
   */
  setVolume(value: number): void {
    this._volume = Math.max(0, Math.min(1.5, value));
  }

  /**
   * Transform PCM audio by applying volume adjustment
   */
  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    // Skip processing if volume is 1.0 (pass-through)
    if (this._volume === 1.0) {
      callback(null, chunk);
      return;
    }

    // Process 16-bit samples (2 bytes each)
    const output = Buffer.alloc(chunk.length);
    const readSample = this.isLittleEndian
      ? (buf: Buffer, offset: number) => buf.readInt16LE(offset)
      : (buf: Buffer, offset: number) => buf.readInt16BE(offset);
    const writeSample = this.isLittleEndian
      ? (buf: Buffer, value: number, offset: number) =>
          buf.writeInt16LE(value, offset)
      : (buf: Buffer, value: number, offset: number) =>
          buf.writeInt16BE(value, offset);

    for (let i = 0; i < chunk.length; i += 2) {
      let sample = readSample(chunk, i);
      sample = Math.round(sample * this._volume);
      // Clamp to prevent overflow
      sample = Math.max(-32768, Math.min(32767, sample));
      writeSample(output, sample, i);
    }

    callback(null, output);
  }
}
