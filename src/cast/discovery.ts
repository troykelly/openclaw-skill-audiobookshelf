/**
 * Cast device discovery via mDNS
 *
 * Discovers Google Cast devices on the local network using bonjour-service.
 * Includes caching, fuzzy name matching, and ID lookup.
 */

import { Bonjour } from 'bonjour-service';
import type { Service, Browser } from 'bonjour-service';
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
export class DeviceDiscovery {
  private cache: CastDevice[] = [];
  private cacheTime = 0;
  private readonly cacheTtlMs: number;
  private discoveryInProgress: Promise<CastDevice[]> | null = null;

  constructor(options: DeviceDiscoveryOptions = {}) {
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
  async discoverDevices(options: ExtendedDiscoveryOptions = {}): Promise<CastDevice[]> {
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
    } finally {
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
  async findDeviceByName(name: string): Promise<CastDevice | null> {
    const devices = await this.discoverDevices();
    const normalizedSearch = name.toLowerCase();

    // Try exact match first
    const exactMatch = devices.find(
      (d) => d.name.toLowerCase() === normalizedSearch
    );
    if (exactMatch) {
      return exactMatch;
    }

    // Try partial match
    const partialMatch = devices.find((d) =>
      d.name.toLowerCase().includes(normalizedSearch)
    );
    return partialMatch ?? null;
  }

  /**
   * Find a device by its Cast ID
   *
   * @param id - The Cast device ID from mDNS TXT record
   * @returns The matching device, or null if not found
   */
  async findDeviceById(id: string): Promise<CastDevice | null> {
    const devices = await this.discoverDevices();
    return devices.find((d) => d.id === id) ?? null;
  }

  /**
   * Clear the cached device list
   */
  clearCache(): void {
    this.cache = [];
    this.cacheTime = 0;
  }

  /**
   * Get cached devices without triggering a scan
   */
  getCachedDevices(): CastDevice[] {
    return [...this.cache];
  }

  /**
   * Check if the cache is still valid
   *
   * An empty device list is considered valid if it was populated recently.
   */
  private isCacheValid(): boolean {
    // If we've never scanned, cache is invalid
    if (this.cacheTime === 0) {
      return false;
    }
    return Date.now() - this.cacheTime < this.cacheTtlMs;
  }

  /**
   * Perform the actual mDNS discovery
   */
  private performDiscovery(timeout: number): Promise<CastDevice[]> {
    return new Promise((resolve) => {
      const devices: CastDevice[] = [];
      const bonjour = new Bonjour();

      const browser: Browser = bonjour.find({ type: 'googlecast' });

      browser.on('up', (service: Service) => {
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
  private serviceToDevice(service: Service): CastDevice {
    const txtRecord = service.txt as Record<string, string> | undefined;

    return {
      name: service.name,
      host: service.addresses?.[0] ?? service.host,
      port: service.port || 8009,
      id: txtRecord?.id,
    };
  }
}

// Shared instance for standalone functions
let sharedDiscovery: DeviceDiscovery | null = null;

/**
 * Get or create the shared discovery instance
 */
function getSharedDiscovery(): DeviceDiscovery {
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
export async function discoverDevices(
  options: ExtendedDiscoveryOptions = {}
): Promise<CastDevice[]> {
  return getSharedDiscovery().discoverDevices(options);
}

/**
 * Find a device by name (standalone function)
 *
 * @param name - Device name or partial name
 * @returns The matching device, or null if not found
 */
export async function findDeviceByName(name: string): Promise<CastDevice | null> {
  return getSharedDiscovery().findDeviceByName(name);
}

/**
 * Find a device by Cast ID (standalone function)
 *
 * @param id - The Cast device ID
 * @returns The matching device, or null if not found
 */
export async function findDeviceById(id: string): Promise<CastDevice | null> {
  return getSharedDiscovery().findDeviceById(id);
}

/**
 * Clear the shared discovery cache (standalone function)
 */
export function clearDiscoveryCache(): void {
  getSharedDiscovery().clearCache();
}
