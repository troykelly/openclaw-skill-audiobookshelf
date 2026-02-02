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
export declare class VolumeTransform extends Transform {
    private _volume;
    private readonly isLittleEndian;
    constructor(options?: VolumeTransformOptions);
    /**
     * Get current volume level
     */
    get volume(): number;
    /**
     * Set volume level
     * @param value - Volume level (0.0 = silent, 1.0 = normal, 1.5 = max)
     */
    setVolume(value: number): void;
    /**
     * Transform PCM audio by applying volume adjustment
     */
    _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void;
}
//# sourceMappingURL=volume-transform.d.ts.map