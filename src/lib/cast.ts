/**
 * Google Cast controller
 *
 * Provides discovery and playback control for Google Cast devices.
 * Uses bonjour-service for mDNS discovery and castv2-client for Cast protocol.
 */

import { Bonjour } from 'bonjour-service';
import type { Service, Browser } from 'bonjour-service';
import { Client, DefaultMediaReceiver } from 'castv2-client';
import type { MediaInfo } from 'castv2-client';
import type { CastDevice } from './types.js';

/**
 * Options for device discovery
 */
interface DiscoveryOptions {
  /** Discovery timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Metadata for cast stream
 */
interface StreamMetadata {
  title?: string;
  artist?: string;
  coverUrl?: string;
}

/**
 * Controller for Google Cast devices
 */
export class CastController {
  private currentDevice: CastDevice | null = null;
  private client: Client | null = null;
  private player: DefaultMediaReceiver | null = null;
  private bonjour: Bonjour | null = null;

  /**
   * Discover Cast devices on the network
   * @param options - Discovery options
   * @returns Array of discovered Cast devices
   */
  discoverDevices(options: DiscoveryOptions = {}): Promise<CastDevice[]> {
    const timeout = options.timeout ?? 5000;
    const devices: CastDevice[] = [];

    return new Promise((resolve) => {
      this.bonjour = new Bonjour();

      const browser: Browser = this.bonjour.find({ type: 'googlecast' });

      browser.on('up', (service: Service) => {
        const device: CastDevice = {
          name: service.name,
          host: service.addresses?.[0] ?? service.host,
          port: service.port,
          id: service.txt.id as string | undefined,
        };

        // Avoid duplicates
        if (!devices.some((d) => d.host === device.host && d.port === device.port)) {
          devices.push(device);
        }
      });

      // Resolve after timeout
      setTimeout(() => {
        browser.stop();
        this.bonjour?.destroy();
        this.bonjour = null;
        resolve(devices);
      }, timeout);
    });
  }

  /**
   * Connect to a Cast device
   * @param device - The device to connect to
   */
  async connect(device: CastDevice): Promise<void> {
    // Disconnect existing connection
    if (this.client) {
      this.disconnect();
    }

    return new Promise((resolve, reject) => {
      this.client = new Client();

      this.client.on('error', (err: Error) => {
        this.handleDisconnect();
        reject(err);
      });

      this.client.connect({ host: device.host, port: device.port }, (err?: Error) => {
        if (err) {
          this.client = null;
          reject(err);
        } else {
          this.currentDevice = device;
          resolve();
        }
      });
    });
  }

  /**
   * Cast audio stream to connected device
   * @param streamUrl - URL of the audio stream
   * @param metadata - Optional metadata for the stream
   */
  castStream(streamUrl: string, metadata?: StreamMetadata): Promise<void> {
    if (!this.client || !this.currentDevice) {
      return Promise.reject(new Error('Not connected to any device'));
    }

    const client = this.client;

    return new Promise((resolve, reject) => {
      client.launch(
        DefaultMediaReceiver,
        (err: Error | null, player: DefaultMediaReceiver) => {
          if (err) {
            reject(err);
            return;
          }

          this.player = player;

          // Set up error handler
          this.player.on('status', () => {
            // Status updates - could be used for progress tracking
          });

          const media: MediaInfo = {
            contentId: streamUrl,
            contentType: 'audio/mpeg',
            streamType: 'BUFFERED',
            metadata: metadata
              ? {
                  type: 0,
                  metadataType: 3, // Music track
                  title: metadata.title,
                  artist: metadata.artist,
                  images: metadata.coverUrl ? [{ url: metadata.coverUrl }] : undefined,
                }
              : undefined,
          };

          this.player.load(media, { autoplay: true }, (loadErr: Error | null) => {
            if (loadErr) {
              reject(loadErr);
            } else {
              resolve();
            }
          });
        }
      );
    });
  }

  /**
   * Seek to position in current stream
   * @param seconds - Position in seconds
   */
  seek(seconds: number): Promise<void> {
    if (!this.player) {
      return Promise.reject(new Error('No active playback'));
    }

    const player = this.player;

    return new Promise((resolve, reject) => {
      player.seek(seconds, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Pause current playback
   */
  pause(): Promise<void> {
    if (!this.player) {
      return Promise.reject(new Error('No active playback'));
    }

    const player = this.player;

    return new Promise((resolve, reject) => {
      player.pause((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Resume playback
   */
  resume(): Promise<void> {
    if (!this.player) {
      return Promise.reject(new Error('No active playback'));
    }

    const player = this.player;

    return new Promise((resolve, reject) => {
      player.play((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Stop playback and disconnect
   */
  async stop(): Promise<void> {
    if (this.player) {
      const player = this.player;
      await new Promise<void>((resolve) => {
        player.stop((_err: Error | null) => {
          // Ignore stop errors, continue with disconnect
          resolve();
        });
      });
    }

    this.disconnect();
  }

  /**
   * Get current playback position
   * @returns Current position in seconds, or 0 if not playing
   */
  getCurrentTime(): Promise<number> {
    if (!this.player) {
      return Promise.resolve(0);
    }

    const player = this.player;

    return new Promise((resolve) => {
      player.getStatus((err, status) => {
        if (err || !status) {
          resolve(0);
        } else {
          resolve(status.currentTime ?? 0);
        }
      });
    });
  }

  /**
   * Get connected device info
   * @returns The connected device or null if not connected
   */
  getConnectedDevice(): CastDevice | null {
    return this.currentDevice;
  }

  /**
   * Disconnect from current device
   */
  private disconnect(): void {
    if (this.client) {
      this.client.close();
    }
    this.handleDisconnect();
  }

  /**
   * Handle disconnection cleanup
   */
  private handleDisconnect(): void {
    this.client = null;
    this.player = null;
    this.currentDevice = null;
  }
}
