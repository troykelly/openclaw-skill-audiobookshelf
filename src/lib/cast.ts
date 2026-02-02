/**
 * Google Cast controller
 *
 * Provides discovery and playback control for Google Cast devices.
 * Uses bonjour-service for mDNS discovery and castv2-client for Cast protocol.
 * Resolves .local hostnames when addresses are not provided (common for Cast groups).
 */

import { Bonjour } from 'bonjour-service';
import type { Service, Browser } from 'bonjour-service';
import { lookup as dnsLookup } from 'dns/promises';
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
    const timeout = options.timeout ?? 10000;
    const services: Service[] = [];

    return new Promise((resolve) => {
      this.bonjour = new Bonjour();

      const browser: Browser = this.bonjour.find({ type: 'googlecast' });

      browser.on('up', (service: Service) => {
        services.push(service);
      });

      // Resolve after timeout
      setTimeout(() => {
        browser.stop();
        this.bonjour?.destroy();
        this.bonjour = null;
        
        // Convert services to devices with hostname resolution
        void this.resolveDevices(services).then(resolve);
      }, timeout);
    });
  }

  /**
   * Convert services to devices, resolving .local hostnames as needed
   * 
   * First builds a map of .local hostnames to IPs from services that have addresses,
   * then uses this cache to resolve hostnames for Cast groups (which often have empty addresses).
   */
  private async resolveDevices(services: Service[]): Promise<CastDevice[]> {
    // Build hostname → IP map from services that have resolved addresses
    const hostnameToIp = new Map<string, string>();
    for (const service of services) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- host may be undefined in mocks
      if (service.addresses?.length && service.host?.endsWith('.local')) {
        hostnameToIp.set(service.host, service.addresses[0]);
      }
    }

    const devices: CastDevice[] = [];
    
    for (const service of services) {
      const txtRecord = service.txt as Record<string, string> | undefined;
      // Use friendly name (fn) from TXT record if available, fall back to service name
      const friendlyName = txtRecord?.fn ?? service.name;

      // Determine host: prefer addresses array, fall back to hostname
      let host = service.addresses?.[0] ?? service.host;

      // If we have a .local hostname and no resolved address, try resolution
      if (
        !service.addresses?.length &&
        service.host.endsWith('.local')
      ) {
        // First check if another service has the same hostname with a resolved IP
        // This is common for Cast groups which share a hostname with their base device
        const cachedIp = hostnameToIp.get(service.host);
        if (cachedIp) {
          host = cachedIp;
        } else {
          // Fall back to DNS resolution
          host = await this.resolveLocalHostname(service.host);
        }
      }

      const device: CastDevice = {
        name: friendlyName,
        host,
        port: service.port,
        id: txtRecord?.id,
      };

      // Avoid duplicates
      if (!devices.some((d) => d.host === device.host && d.port === device.port)) {
        devices.push(device);
      }
    }
    
    return devices;
  }

  /**
   * Resolve a .local mDNS hostname to an IP address
   * 
   * @param hostname - The .local hostname to resolve
   * @returns The resolved IP address, or the original hostname if resolution fails
   */
  private async resolveLocalHostname(hostname: string): Promise<string> {
    try {
      const result = await dnsLookup(hostname);
      return result.address;
    } catch {
      // DNS lookup failed - fall back to the original hostname
      return hostname;
    }
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
