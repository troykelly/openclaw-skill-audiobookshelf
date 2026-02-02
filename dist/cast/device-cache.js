/**
 * Persistent device cache for Cast discovery
 *
 * Caches discovered devices to disk to avoid repeated mDNS scans on flaky networks.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
const CACHE_VERSION = 1;
const DEFAULT_CACHE_PATH = join(homedir(), '.cache', 'abs', 'devices.json');
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Persistent device cache
 */
export class DeviceCache {
    cachePath;
    ttlMs;
    cache;
    constructor(options = {}) {
        this.cachePath = options.cachePath ?? DEFAULT_CACHE_PATH;
        this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
        this.cache = this.load();
    }
    /**
     * Load cache from disk
     */
    load() {
        try {
            if (existsSync(this.cachePath)) {
                const data = JSON.parse(readFileSync(this.cachePath, 'utf-8'));
                if (data.version === CACHE_VERSION) {
                    return data;
                }
            }
        }
        catch {
            // Ignore load errors - start fresh
        }
        return { version: CACHE_VERSION, entries: {} };
    }
    /**
     * Save cache to disk
     */
    save() {
        try {
            const dir = dirname(this.cachePath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2));
        }
        catch {
            // Ignore save errors - cache is best-effort
        }
    }
    /**
     * Get a device by name from cache (if not expired)
     */
    get(name) {
        const normalizedName = name.toLowerCase();
        const now = Date.now();
        for (const entry of Object.values(this.cache.entries)) {
            if (entry.device.name.toLowerCase().includes(normalizedName)) {
                if (now - entry.discoveredAt < this.ttlMs) {
                    return entry.device;
                }
            }
        }
        return null;
    }
    /**
     * Get all cached devices (filters expired)
     */
    getAll() {
        const now = Date.now();
        return Object.values(this.cache.entries)
            .filter(entry => now - entry.discoveredAt < this.ttlMs)
            .map(entry => entry.device);
    }
    /**
     * Update cache with discovered devices
     */
    update(devices) {
        const now = Date.now();
        for (const device of devices) {
            // Use host:port as unique key
            const key = `${device.host}:${String(device.port)}`;
            this.cache.entries[key] = {
                device,
                discoveredAt: now,
            };
        }
        this.save();
    }
    /**
     * Clear all cached devices
     */
    clear() {
        this.cache.entries = {};
        this.save();
    }
    /**
     * Check if cache has any valid entries
     */
    hasValidEntries() {
        return this.getAll().length > 0;
    }
}
// Shared instance
let sharedCache = null;
/**
 * Get or create the shared device cache instance
 */
export function getDeviceCache() {
    sharedCache ??= new DeviceCache();
    return sharedCache;
}
//# sourceMappingURL=device-cache.js.map