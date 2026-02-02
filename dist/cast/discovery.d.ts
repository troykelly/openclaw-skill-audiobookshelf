/**
 * Cast device discovery via mDNS
 *
 * Discovers Google Cast devices on the local network using bonjour-service.
 * Includes caching, fuzzy name matching, and ID lookup.
 */
import type { CastDevice, DiscoveryOptions } from './types.js';
/**
 * Extended discovery options including cache control
 */
interface ExtendedDiscoveryOptions extends DiscoveryOptions {
    /** Force a fresh scan, ignoring cache */
    forceRefresh?: boolean;
}
/**
 * Options for DeviceDiscovery constructor
 */
interface DeviceDiscoveryOptions {
    /** Cache TTL in milliseconds (default: 30000 = 30s) */
    cacheTtlMs?: number;
}
/**
 * Device discovery with caching and helper methods
 */
export declare class DeviceDiscovery {
    private cache;
    private cacheTime;
    private readonly cacheTtlMs;
    private discoveryInProgress;
    constructor(options?: DeviceDiscoveryOptions);
    /**
     * Discover Cast devices on the network
     *
     * Results are cached to avoid repeated network scans.
     * Use `forceRefresh: true` to bypass the cache.
     *
     * @param options - Discovery options
     * @returns Array of discovered Cast devices
     */
    discoverDevices(options?: ExtendedDiscoveryOptions): Promise<CastDevice[]>;
    /**
     * Find a device by its friendly name
     *
     * Performs case-insensitive partial matching.
     *
     * @param name - Device name or partial name to search for
     * @returns The matching device, or null if not found
     */
    findDeviceByName(name: string): Promise<CastDevice | null>;
    /**
     * Find a device by its Cast ID
     *
     * @param id - The Cast device ID from mDNS TXT record
     * @returns The matching device, or null if not found
     */
    findDeviceById(id: string): Promise<CastDevice | null>;
    /**
     * Clear the cached device list
     */
    clearCache(): void;
    /**
     * Get cached devices without triggering a scan
     */
    getCachedDevices(): CastDevice[];
    /**
     * Check if the cache is still valid
     *
     * An empty device list is considered valid if it was populated recently.
     */
    private isCacheValid;
    /**
     * Perform the actual mDNS discovery
     */
    private performDiscovery;
    /**
     * Convert a Bonjour service to a CastDevice
     */
    private serviceToDevice;
}
/**
 * Discover Cast devices on the network (standalone function)
 *
 * Uses a shared discovery instance with caching.
 *
 * @param options - Discovery options
 * @returns Array of discovered Cast devices
 */
export declare function discoverDevices(options?: ExtendedDiscoveryOptions): Promise<CastDevice[]>;
/**
 * Find a device by name (standalone function)
 *
 * @param name - Device name or partial name
 * @returns The matching device, or null if not found
 */
export declare function findDeviceByName(name: string): Promise<CastDevice | null>;
/**
 * Find a device by Cast ID (standalone function)
 *
 * @param id - The Cast device ID
 * @returns The matching device, or null if not found
 */
export declare function findDeviceById(id: string): Promise<CastDevice | null>;
/**
 * Clear the shared discovery cache (standalone function)
 */
export declare function clearDiscoveryCache(): void;
export {};
//# sourceMappingURL=discovery.d.ts.map