/**
 * Cast client for Google Cast playback
 *
 * Provides media playback control using AUDIOBOOK_CHAPTER metadata type
 * to enable Nest Hub low-light mode during audiobook playback.
 */

import { EventEmitter } from 'events';
import { Client, DefaultMediaReceiver } from 'castv2-client';
import type { PlayerStatus } from 'castv2-client';
import {
  MetadataType,
  StreamType,
  PlayerState,
  type CastDevice,
  type CastMediaStatus,
} from './types.js';

/**
 * Options for loading media
 */
export interface MediaLoadOptions {
  /** URL of the audio stream */
  url: string;
  /** MIME type (e.g., 'audio/mpeg') */
  contentType: string;
  /** Book/media title */
  title: string;
  /** Author name */
  author?: string;
  /** Chapter title */
  chapterTitle?: string;
  /** Chapter number */
  chapterNumber?: number;
  /** Cover image URL */
  coverUrl?: string;
  /** Resume position in seconds */
  resumePosition?: number;
  /** Duration in seconds (optional, for progress display) */
  duration?: number;
}

/**
 * Internal media info structure for Cast protocol
 */
interface CastMediaInfo {
  contentId: string;
  contentType: string;
  streamType: string;
  duration?: number;
  metadata: {
    type: number;
    metadataType: number;
    title?: string;
    subtitle?: string;
    artist?: string;
    bookTitle?: string;
    chapterTitle?: string;
    chapterNumber?: number;
    images: { url: string }[];
  };
}

/**
 * Cast client events
 */
export interface CastClientEvents {
  connected: (device: CastDevice) => void;
  disconnected: () => void;
  error: (error: Error) => void;
  status: (status: CastMediaStatus) => void;
}

/**
 * Google Cast client with AUDIOBOOK_CHAPTER metadata support
 *
 * Uses metadataType: 4 (AUDIOBOOK_CHAPTER) to enable Nest Hub
 * low-light mode during audiobook playback.
 */
export class CastClient extends EventEmitter {
  private client: Client | null = null;
  private player: DefaultMediaReceiver | null = null;
  private connectedDevice: CastDevice | null = null;
  private _isConnected = false;

  /**
   * Connect to a Cast device
   *
   * @param device - The device to connect to
   * @throws Error if connection fails
   */
  async connect(device: CastDevice): Promise<void> {
    // Disconnect any existing connection
    if (this.client) {
      this.disconnect();
    }

    return new Promise((resolve, reject) => {
      this.client = new Client();

      this.client.on('error', (err: Error) => {
        this.handleError(err);
        reject(err);
      });

      this.client.connect(
        { host: device.host, port: device.port },
        (err?: Error) => {
          if (err) {
            this.client = null;
            reject(err);
          } else {
            this.connectedDevice = device;
            this._isConnected = true;
            this.emit('connected', device);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Load media onto the Cast device
   *
   * Uses AUDIOBOOK_CHAPTER metadata type (metadataType: 4) which
   * enables Nest Hub low-light mode during playback.
   *
   * @param options - Media loading options
   * @throws Error if not connected or load fails
   */
  async loadMedia(options: MediaLoadOptions): Promise<void> {
    if (!this.client || !this._isConnected) {
      throw new Error('Not connected to any Cast device');
    }

    const client = this.client;

    // Launch the DefaultMediaReceiver if not already launched
    if (!this.player) {
      await new Promise<void>((resolve, reject) => {
        client.launch(
          DefaultMediaReceiver,
          (err: Error | null, player: DefaultMediaReceiver) => {
            if (err) {
              reject(err);
            } else {
              this.player = player;
              this.setupPlayerListeners();
              resolve();
            }
          }
        );
      });
    }

    const player = this.player;
    if (!player) {
      throw new Error('Failed to launch media receiver');
    }

    // Build media info with AUDIOBOOK_CHAPTER metadata type
    const media: CastMediaInfo = {
      contentId: options.url,
      contentType: options.contentType,
      streamType: StreamType.BUFFERED,
      duration: options.duration,
      metadata: {
        type: 0, // Required by castv2-client
        metadataType: MetadataType.AUDIOBOOK_CHAPTER,
        title: options.title,
        subtitle: options.author,
        artist: options.author,
        bookTitle: options.title,
        chapterTitle: options.chapterTitle,
        chapterNumber: options.chapterNumber,
        images: options.coverUrl ? [{ url: options.coverUrl }] : [],
      },
    };

    // Load options
    const loadOptions: { autoplay: boolean; currentTime?: number } = {
      autoplay: true,
    };

    if (options.resumePosition !== undefined && options.resumePosition > 0) {
      loadOptions.currentTime = options.resumePosition;
    }

    return new Promise((resolve, reject) => {
      player.load(media, loadOptions, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.player) {
      throw new Error('No active playback');
    }

    const player = this.player;

    return new Promise((resolve, reject) => {
      player.pause((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Resume playback
   */
  async play(): Promise<void> {
    if (!this.player) {
      throw new Error('No active playback');
    }

    const player = this.player;

    return new Promise((resolve, reject) => {
      player.play((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    if (!this.player) {
      return;
    }

    const player = this.player;

    return new Promise((resolve) => {
      player.stop((_err: Error | null) => {
        // Ignore stop errors
        resolve();
      });
    });
  }

  /**
   * Seek to position
   *
   * @param position - Position in seconds
   */
  async seek(position: number): Promise<void> {
    if (!this.player) {
      throw new Error('No active playback');
    }

    const player = this.player;

    return new Promise((resolve, reject) => {
      player.seek(position, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get current playback status
   *
   * @returns Current status or null if not playing
   */
  async getStatus(): Promise<CastMediaStatus | null> {
    if (!this.player) {
      return null;
    }

    const player = this.player;

    return new Promise((resolve) => {
      player.getStatus((err: Error | null, status: PlayerStatus | null) => {
        if (err || !status) {
          resolve(null);
        } else {
          // Status fields may be undefined at runtime, use defaults
          const currentTime = status.currentTime ?? 0;
          const playerState = status.playerState as PlayerState | undefined;
          const volume = status.volume;

          resolve({
            currentTime,
            playerState: playerState ?? PlayerState.IDLE,
            volume: volume ?? { level: 1, muted: false },
            media: status.media
              ? {
                  contentId: status.media.contentId,
                  contentType: status.media.contentType,
                  // Note: duration might be in the media object directly, not in metadata
                  duration: (status.media as { duration?: number }).duration,
                }
              : undefined,
          });
        }
      });
    });
  }

  /**
   * Disconnect from the Cast device
   */
  disconnect(): void {
    if (this.client) {
      this.client.close();
    }
    this.cleanup();
    this.emit('disconnected');
  }

  /**
   * Check if connected to a device
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Get the connected device info
   */
  getConnectedDevice(): CastDevice | null {
    return this.connectedDevice;
  }

  /**
   * Set up event listeners on the player
   */
  private setupPlayerListeners(): void {
    if (!this.player) return;

    this.player.on('status', (status: PlayerStatus) => {
      // Extract fields with defaults for undefined values
      const currentTime = status.currentTime ?? 0;
      const playerState = status.playerState as PlayerState | undefined;
      const volume = status.volume;

      this.emit('status', {
        currentTime,
        playerState: playerState ?? PlayerState.IDLE,
        volume: volume ?? { level: 1, muted: false },
      });
    });
  }

  /**
   * Handle connection errors
   */
  private handleError(err: Error): void {
    this.emit('error', err);
    this.cleanup();
  }

  /**
   * Clean up state after disconnect
   */
  private cleanup(): void {
    this.client = null;
    this.player = null;
    this.connectedDevice = null;
    this._isConnected = false;
  }
}
