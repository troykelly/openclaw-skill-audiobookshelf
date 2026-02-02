/**
 * Cast device discovery via mDNS
 *
 * Discovers Google Cast devices on the local network using bonjour-service.
 * Includes caching, fuzzy name matching, and ID lookup.
 * Resolves .local hostnames when addresses are not provided (common for Cast groups).
 */
import { Bonjour } from 'bonjour-service';
import { lookup as dnsLookup } from 'dns/promises';
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
        const timeout = options.timeout ?? 10000;
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
            const services = [];
            const bonjour = new Bonjour();
            const browser = bonjour.find({ type: 'googlecast' });
            browser.on('up', (service) => {
                services.push(service);
            });
            // Resolve after timeout
            setTimeout(() => {
                browser.stop();
                bonjour.destroy();
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
    async resolveDevices(services) {
        // Build hostname → IP map from services that have resolved addresses
        const hostnameToIp = new Map();
        for (const service of services) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- host may be undefined in mocks
            if (service.addresses?.length && service.host?.endsWith('.local')) {
                hostnameToIp.set(service.host, service.addresses[0]);
            }
        }
        const devices = [];
        for (const service of services) {
            const device = await this.serviceToDeviceWithResolution(service, hostnameToIp);
            // Avoid duplicates by host and port
            if (!devices.some((d) => d.host === device.host && d.port === device.port)) {
                devices.push(device);
            }
        }
        return devices;
    }
    /**
     * Convert a Bonjour service to a CastDevice, resolving .local hostnames
     *
     * @param service - The Bonjour service to convert
     * @param hostnameCache - Map of .local hostnames to IPs from other discovered services
     */
    async serviceToDeviceWithResolution(service, hostnameCache) {
        const txtRecord = service.txt;
        // Use friendly name (fn) from TXT record if available, fall back to service name
        const friendlyName = txtRecord?.fn ?? service.name;
        // Determine host: prefer addresses array, fall back to hostname
        let host = service.addresses?.[0] ?? service.host;
        // If we have a .local hostname and no resolved address, try resolution
        if (!service.addresses?.length &&
            service.host.endsWith('.local')) {
            // First check if another service has the same hostname with a resolved IP
            // This is common for Cast groups which share a hostname with their base device
            const cachedIp = hostnameCache.get(service.host);
            if (cachedIp) {
                host = cachedIp;
            }
            else {
                // Fall back to DNS resolution
                host = await this.resolveLocalHostname(service.host);
            }
        }
        return {
            name: friendlyName,
            host,
            port: service.port || 8009,
            id: txtRecord?.id,
        };
    }
    /**
     * Resolve a .local mDNS hostname to an IP address
     *
     * @param hostname - The .local hostname to resolve
     * @returns The resolved IP address, or the original hostname if resolution fails
     */
    async resolveLocalHostname(hostname) {
        try {
            const result = await dnsLookup(hostname);
            return result.address;
        }
        catch {
            // DNS lookup failed - fall back to the original hostname
            return hostname;
        }
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