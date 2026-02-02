/**
 * Cast module exports
 *
 * Native Google Cast control for Audiobookshelf playback.
 * Uses castv2-client for Cast protocol and bonjour-service for mDNS discovery.
 */
export * from './types.js';
export { DeviceDiscovery, discoverDevices, findDeviceByName, findDeviceById, clearDiscoveryCache, } from './discovery.js';
export { DeviceCache, getDeviceCache } from './device-cache.js';
export { CastClient, type MediaLoadOptions } from './client.js';
export { PositionTracker, type SyncCallback, type FinishedCallback, type ErrorCallback, type PositionTrackerOptions, } from './position-tracker.js';
export { CastSleepTimer, type CastSleepTimerOptions, type CastSleepTimerState, type SleepTimerPhase, } from './sleep-timer.js';
export { Client, DefaultMediaReceiver } from 'castv2-client';
export { Bonjour } from 'bonjour-service';
//# sourceMappingURL=index.d.ts.map