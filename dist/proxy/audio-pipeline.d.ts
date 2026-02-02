/**
 * Audio Pipeline
 *
 * Creates a decode → volume transform → encode pipeline using ffmpeg.
 * The pipeline enables real-time volume control during streaming.
 */
import { type Readable } from 'stream';
import { VolumeTransform } from './volume-transform.js';
/**
 * Options for AudioPipeline
 */
export interface AudioPipelineOptions {
    /** Input URL or file path */
    inputUrl: string;
    /** Start position in seconds */
    startPosition?: number;
    /** Output bitrate (default: 192k) */
    outputBitrate?: string;
    /** Sample rate (default: 44100) */
    sampleRate?: number;
    /** Number of channels (default: 2) */
    channels?: number;
    /** Initial volume (0.0 - 1.5, default: 1.0) */
    initialVolume?: number;
    /** Authorization header for input URL (optional) */
    authHeader?: string;
}
/**
 * Audio pipeline with real-time volume control
 *
 * Architecture:
 * Input (URL/file) → ffmpeg decode → VolumeTransform (PCM) → ffmpeg encode → Output (MP3)
 */
export declare class AudioPipeline {
    private readonly options;
    private decoder?;
    private encoder?;
    private readonly volumeTransform;
    private readonly output;
    private _isRunning;
    private _bytesOutput;
    private readonly bitrate;
    private readonly startPosition;
    constructor(options: AudioPipelineOptions);
    /**
     * Get the output stream
     */
    getOutputStream(): Readable;
    /**
     * Get the volume transform for real-time control
     */
    getVolumeTransform(): VolumeTransform;
    /**
     * Set volume level (0.0 - 1.5)
     */
    setVolume(volume: number): void;
    /**
     * Get current volume level
     */
    getVolume(): number;
    /**
     * Check if pipeline is running
     */
    isRunning(): boolean;
    /**
     * Get current playback position in seconds (estimated from bytes output)
     */
    getCurrentPosition(): number;
    /**
     * Start the pipeline
     */
    start(): void;
    /**
     * Stop the pipeline
     */
    stop(): void;
    /**
     * Build decoder ffmpeg arguments
     */
    private buildDecoderArgs;
    /**
     * Build encoder ffmpeg arguments
     */
    private buildEncoderArgs;
}
//# sourceMappingURL=audio-pipeline.d.ts.map