/**
 * Cast device discovery via mDNS
 *
 * Discovers Google Cast devices on the local network using bonjour-service.
 * Includes caching, fuzzy name matching, and ID lookup.
 */
import { Bonjour } from 'bonjour-service';
/**
 * Device discovery with caching and helper methods
 */
export class DeviceDiscovery {
    cache = [];
    cacheTime = 0;
    cacheTtlMs;
    discoveryInProgress = null;
    constructor(options = {}) {
        this.cacheTtlMs = options.cacheTtlMs ?? 30000;
    }
    /**
     * Discover Cast devices on the network
     *
     * Results are cached to avoid repeated network scans.
     * Use `forceRefresh: true` to bypass the cache.
     *
     * @param options - Discovery options
     * @returns Array of discovered Cast devices
     */
    async discoverDevices(options = {}) {
        const timeout = options.timeout ?? 5000;
        const forceRefresh = options.forceRefresh ?? false;
        // Check cache validity
        if (!forceRefresh && this.isCacheValid()) {
            return this.cache;
        }
        // If discovery is already in progress, wait for it
        if (this.discoveryInProgress) {
            return this.discoveryInProgress;
        }
        // Start new discovery
        this.discoveryInProgress = this.performDiscovery(timeout);
        try {
            const devices = await this.discoveryInProgress;
            this.cache = devices;
            this.cacheTime = Date.now();
            return devices;
        }
        finally {
            this.discoveryInProgress = null;
        }
    }
    /**
     * Find a device by its friendly name
     *
     * Performs case-insensitive partial matching.
     *
     * @param name - Device name or partial name to search for
     * @returns The matching device, or null if not found
     */
    async findDeviceByName(name) {
        const devices = await this.discoverDevices();
        const normalizedSearch = name.toLowerCase();
        // Try exact match first
        const exactMatch = devices.find((d) => d.name.toLowerCase() === normalizedSearch);
        if (exactMatch) {
            return exactMatch;
        }
        // Try partial match
        const partialMatch = devices.find((d) => d.name.toLowerCase().includes(normalizedSearch));
        return partialMatch ?? null;
    }
    /**
     * Find a device by its Cast ID
     *
     * @param id - The Cast device ID from mDNS TXT record
     * @returns The matching device, or null if not found
     */
    async findDeviceById(id) {
        const devices = await this.discoverDevices();
        return devices.find((d) => d.id === id) ?? null;
    }
    /**
     * Clear the cached device list
     */
    clearCache() {
        this.cache = [];
        this.cacheTime = 0;
    }
    /**
     * Get cached devices without triggering a scan
     */
    getCachedDevices() {
        return [...this.cache];
    }
    /**
     * Check if the cache is still valid
     *
     * An empty device list is considered valid if it was populated recently.
     */
    isCacheValid() {
        // If we've never scanned, cache is invalid
        if (this.cacheTime === 0) {
            return false;
        }
        return Date.now() - this.cacheTime < this.cacheTtlMs;
    }
    /**
     * Perform the actual mDNS discovery
     */
    performDiscovery(timeout) {
        return new Promise((resolve) => {
            const devices = [];
            const bonjour = new Bonjour();
            const browser = bonjour.find({ type: 'googlecast' });
            browser.on('up', (service) => {
                const device = this.serviceToDevice(service);
                // Avoid duplicates by host and port
                if (!devices.some((d) => d.host === device.host && d.port === device.port)) {
                    devices.push(device);
                }
            });
            // Resolve after timeout
            setTimeout(() => {
                browser.stop();
                bonjour.destroy();
                resolve(devices);
            }, timeout);
        });
    }
    /**
     * Convert a Bonjour service to a CastDevice
     */
    serviceToDevice(service) {
        const txtRecord = service.txt;
        return {
            name: service.name,
            host: service.addresses?.[0] ?? service.host,
            port: service.port || 8009,
            id: txtRecord?.id,
        };
    }
}
// Shared instance for standalone functions
let sharedDiscovery = null;
/**
 * Get or create the shared discovery instance
 */
function getSharedDiscovery() {
    sharedDiscovery ??= new DeviceDiscovery();
    return sharedDiscovery;
}
/**
 * Discover Cast devices on the network (standalone function)
 *
 * Uses a shared discovery instance with caching.
 *
 * @param options - Discovery options
 * @returns Array of discovered Cast devices
 */
export async function discoverDevices(options = {}) {
    return getSharedDiscovery().discoverDevices(options);
}
/**
 * Find a device by name (standalone function)
 *
 * @param name - Device name or partial name
 * @returns The matching device, or null if not found
 */
export async function findDeviceByName(name) {
    return getSharedDiscovery().findDeviceByName(name);
}
/**
 * Find a device by Cast ID (standalone function)
 *
 * @param id - The Cast device ID
 * @returns The matching device, or null if not found
 */
export async function findDeviceById(id) {
    return getSharedDiscovery().findDeviceById(id);
}
/**
 * Clear the shared discovery cache (standalone function)
 */
export function clearDiscoveryCache() {
    getSharedDiscovery().clearCache();
}
//# sourceMappingURL=discovery.js.map