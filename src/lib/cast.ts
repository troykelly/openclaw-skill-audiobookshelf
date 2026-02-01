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
  discoverDevices(): Promise<CastDevice[]> {
    // TODO: Implement with bonjour-service in issue #4
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Connect to a Cast device
   */
  connect(_device: CastDevice): Promise<void> {
    // TODO: Implement with castv2-client in issue #4
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Cast audio stream to connected device
   */
  castStream(_streamUrl: string, _metadata?: { title?: string; artist?: string }): Promise<void> {
    // TODO: Implement in issue #4
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Seek to position in current stream
   */
  seek(_seconds: number): Promise<void> {
    // TODO: Implement in issue #4
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Pause current playback
   */
  pause(): Promise<void> {
    // TODO: Implement in issue #4
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Resume playback
   */
  resume(): Promise<void> {
    // TODO: Implement in issue #4
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Stop playback and disconnect
   */
  stop(): Promise<void> {
    // TODO: Implement in issue #4
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Get current playback position
   */
  getCurrentTime(): Promise<number> {
    // TODO: Implement in issue #4
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Get connected device info
   */
  getConnectedDevice(): CastDevice | null {
    return this.currentDevice;
  }
}
