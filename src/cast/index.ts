/**
 * Cast module exports
 *
 * Native Google Cast control for Audiobookshelf playback.
 * Uses castv2-client for Cast protocol and bonjour-service for mDNS discovery.
 */

// Re-export all types
export * from './types.js';

// Re-export discovery module
export {
  DeviceDiscovery,
  discoverDevices,
  findDeviceByName,
  findDeviceById,
  clearDiscoveryCache,
} from './discovery.js';

// Re-export device cache
export { DeviceCache, getDeviceCache } from './device-cache.js';

// Re-export Cast client
export { CastClient, type MediaLoadOptions } from './client.js';

// Re-export position tracker
export {
  PositionTracker,
  type SyncCallback,
  type FinishedCallback,
  type ErrorCallback,
  type PositionTrackerOptions,
} from './position-tracker.js';

// Re-export sleep timer
export {
  CastSleepTimer,
  type CastSleepTimerOptions,
  type CastSleepTimerState,
  type SleepTimerPhase,
} from './sleep-timer.js';

// Re-export castv2-client types for convenience
export { Client, DefaultMediaReceiver } from 'castv2-client';
export { Bonjour } from 'bonjour-service';
