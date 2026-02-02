/**
 * Persistent device cache for Cast discovery
 *
 * Caches discovered devices to disk to avoid repeated mDNS scans on flaky networks.
 */
import type { CastDevice } from './types.js';
/**
 * Persistent device cache
 */
export declare class DeviceCache {
    private readonly cachePath;
    private readonly ttlMs;
    private cache;
    constructor(options?: {
        cachePath?: string;
        ttlMs?: number;
    });
    /**
     * Load cache from disk
     */
    private load;
    /**
     * Save cache to disk
     */
    private save;
    /**
     * Get a device by name from cache (if not expired)
     */
    get(name: string): CastDevice | null;
    /**
     * Get all cached devices (filters expired)
     */
    getAll(): CastDevice[];
    /**
     * Update cache with discovered devices
     */
    update(devices: CastDevice[]): void;
    /**
     * Clear all cached devices
     */
    clear(): void;
    /**
     * Check if cache has any valid entries
     */
    hasValidEntries(): boolean;
}
/**
 * Get or create the shared device cache instance
 */
export declare function getDeviceCache(): DeviceCache;
//# sourceMappingURL=device-cache.d.ts.map