/**
 * Audio Pipeline
 *
 * Creates a decode → volume transform → encode pipeline using ffmpeg.
 * The pipeline enables real-time volume control during streaming.
 */

import { spawn, type ChildProcess } from 'child_process';
import { type Readable, PassThrough } from 'stream';
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
export class AudioPipeline {
  private decoder?: ChildProcess;
  private encoder?: ChildProcess;
  private readonly volumeTransform: VolumeTransform;
  private readonly output: PassThrough;
  private _isRunning = false;
  private _bytesOutput = 0;
  private readonly bitrate: number;
  private readonly startPosition: number;

  constructor(private readonly options: AudioPipelineOptions) {
    this.volumeTransform = new VolumeTransform({
      initialVolume: options.initialVolume ?? 1.0,
    });
    this.output = new PassThrough();
    this.bitrate = parseInt(options.outputBitrate ?? '192k', 10) * 1000;
    this.startPosition = options.startPosition ?? 0;
  }

  /**
   * Get the output stream
   */
  getOutputStream(): Readable {
    return this.output;
  }

  /**
   * Get the volume transform for real-time control
   */
  getVolumeTransform(): VolumeTransform {
    return this.volumeTransform;
  }

  /**
   * Set volume level (0.0 - 1.5)
   */
  setVolume(volume: number): void {
    this.volumeTransform.setVolume(volume);
  }

  /**
   * Get current volume level
   */
  getVolume(): number {
    return this.volumeTransform.volume;
  }

  /**
   * Check if pipeline is running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get current playback position in seconds (estimated from bytes output)
   */
  getCurrentPosition(): number {
    // Position = start offset + (bytes * 8) / bitrate
    return this.startPosition + (this._bytesOutput * 8) / this.bitrate;
  }

  /**
   * Start the pipeline
   */
  start(): void {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;

    // Build decoder args
    const decoderArgs = this.buildDecoderArgs();

    // Build encoder args
    const encoderArgs = this.buildEncoderArgs();

    // Spawn decoder
    this.decoder = spawn('ffmpeg', decoderArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Spawn encoder
    this.encoder = spawn('ffmpeg', encoderArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wire up the pipeline:
    // decoder.stdout → volumeTransform → encoder.stdin
    // encoder.stdout → output

    if (this.decoder.stdout && this.encoder.stdin) {
      this.decoder.stdout.pipe(this.volumeTransform).pipe(this.encoder.stdin);
    }

    if (this.encoder.stdout) {
      this.encoder.stdout.on('data', (chunk: Buffer) => {
        this._bytesOutput += chunk.length;
        this.output.write(chunk);
      });

      this.encoder.stdout.on('end', () => {
        this.output.end();
      });
    }

    // Handle errors
    this.decoder.on('error', (err) => {
      this.output.destroy(err);
    });

    this.encoder.on('error', (err) => {
      this.output.destroy(err);
    });

    // Handle process exit
    this.decoder.on('exit', (code) => {
      if (code !== 0) {
        this.output.destroy(new Error(`Decoder exited with code ${String(code)}`));
      }
    });

    this.encoder.on('exit', () => {
      this._isRunning = false;
    });
  }

  /**
   * Stop the pipeline
   */
  stop(): void {
    this._isRunning = false;

    if (this.decoder) {
      this.decoder.kill('SIGTERM');
      this.decoder = undefined;
    }

    if (this.encoder) {
      this.encoder.kill('SIGTERM');
      this.encoder = undefined;
    }

    this.output.end();
  }

  /**
   * Build decoder ffmpeg arguments
   */
  private buildDecoderArgs(): string[] {
    const args: string[] = [];

    // Input headers if auth needed
    if (this.options.authHeader) {
      args.push('-headers', `Authorization: ${this.options.authHeader}\r\n`);
    }

    // Seek to start position
    if (this.startPosition > 0) {
      args.push('-ss', String(this.startPosition));
    }

    // Input
    args.push('-i', this.options.inputUrl);

    // Output format: raw PCM
    args.push(
      '-f',
      's16le',
      '-acodec',
      'pcm_s16le',
      '-ar',
      String(this.options.sampleRate ?? 44100),
      '-ac',
      String(this.options.channels ?? 2),
      'pipe:1'
    );

    return args;
  }

  /**
   * Build encoder ffmpeg arguments
   */
  private buildEncoderArgs(): string[] {
    return [
      '-f',
      's16le',
      '-ar',
      String(this.options.sampleRate ?? 44100),
      '-ac',
      String(this.options.channels ?? 2),
      '-i',
      'pipe:0',
      '-acodec',
      'libmp3lame',
      '-b:a',
      this.options.outputBitrate ?? '192k',
      '-f',
      'mp3',
      'pipe:1',
    ];
  }
}
