/**
 * Google Cast controller
 */

import type { CastDevice } from './types.js';

/**
 * Controller for Google Cast devices
 */
export class CastController {
  private currentDevice: CastDevice | null = null;

  /**
   * Discover Cast devices on the network
   */
  async discoverDevices(): Promise<CastDevice[]> {
    // TODO: Implement with bonjour-service in issue
    throw new Error('Not implemented');
  }

  /**
   * Connect to a Cast device
   */
  async connect(_device: CastDevice): Promise<void> {
    // TODO: Implement with castv2-client in issue
    throw new Error('Not implemented');
  }

  /**
   * Cast audio stream to connected device
   */
  async castStream(
    _streamUrl: string,
    _metadata?: { title?: string; artist?: string }
  ): Promise<void> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Seek to position in current stream
   */
  async seek(_seconds: number): Promise<void> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Pause current playback
   */
  async pause(): Promise<void> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Stop playback and disconnect
   */
  async stop(): Promise<void> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Get current playback position
   */
  async getCurrentTime(): Promise<number> {
    // TODO: Implement in issue
    throw new Error('Not implemented');
  }

  /**
   * Get connected device info
   */
  getConnectedDevice(): CastDevice | null {
    return this.currentDevice;
  }
}
